const pool = require('../config/db');

class LeaveAllocationService {
    // Personelin çalışma yılını hesapla
    static async calculateYearsOfService(personnelId) {
        try {
            const result = await pool.query(
                `SELECT 
                    hth.hire_date,
                    CASE 
                        WHEN hth.hire_date IS NOT NULL THEN 
                            EXTRACT(YEAR FROM AGE(CURRENT_DATE, hth.hire_date))
                        ELSE 0
                    END as years_of_service,
                    CASE 
                        WHEN hth.hire_date IS NOT NULL THEN 
                            EXTRACT(MONTH FROM AGE(CURRENT_DATE, hth.hire_date))
                        ELSE 0
                    END as months_of_service
                FROM personnel p
                LEFT JOIN hire_termination_history hth ON p.id = hth.personnel_id
                WHERE p.id = $1
                AND hth.termination_date IS NULL  -- Aktif çalışma kaydını al
                ORDER BY hth.hire_date DESC       -- En son işe giriş kaydını al
                LIMIT 1`,
                [personnelId]
            );

            if (!result.rows.length || !result.rows[0].hire_date) {
                console.warn(`No active hire record found for Personnel ID ${personnelId}`);
                return {
                    years: 0,
                    months: 0
                };
            }

            return {
                years: Math.floor(result.rows[0].years_of_service),
                months: Math.floor(result.rows[0].months_of_service % 12)
            };
        } catch (error) {
            console.error('Error calculating years of service:', error);
            throw error;
        }
    }


    static async checkLeaveTypeEligibility(personnelId, leaveTypeId, startDate, endDate) {
        const client = await pool.connect();
        try {
            console.log('Checking eligibility for personnel:', personnelId, 'leave type:', leaveTypeId);

    
            // 1. İzin türü kontrolü
            const leaveTypeCheck = await client.query(`
                SELECT 
                    lt.*,
                    cm.name as calculation_method_name,
                    rp.name as renewal_period_name
                FROM new_leave_types lt
                LEFT JOIN new_leave_calculation_methods cm ON lt.calculation_method_id = cm.id
                LEFT JOIN new_leave_renewal_periods rp ON lt.renewal_period_id = rp.id
                WHERE lt.id = $1 AND lt.is_active = true
            `, [leaveTypeId]);
    
            if (leaveTypeCheck.rows.length === 0) {
                throw new Error('İzin türü bulunamadı veya aktif değil');
            }
    
            const leaveType = leaveTypeCheck.rows[0];
    
            // 2. Personel Kontrolü
            const personnelCheck = await client.query(`
                SELECT 
                    p.*,
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, hth.hire_date)) as years_of_service
                FROM personnel p
                LEFT JOIN hire_termination_history hth ON p.id = hth.personnel_id
                WHERE p.id = $1 AND p.is_active = true AND hth.termination_date IS NULL
                ORDER BY hth.hire_date DESC
                LIMIT 1
            `, [personnelId]);
    
            if (personnelCheck.rows.length === 0) {
                throw new Error('Personel bulunamadı veya aktif değil');
            }
    
            const personnel = personnelCheck.rows[0];
            const yearsOfService = Math.floor(personnel.years_of_service || 0);
    
// İzin politikası kontrolü
const policyCheck = await client.query(`
    SELECT *
    FROM leave_policies lp
    WHERE lp.leave_type_id = $1
    AND lp.effective_from <= CURRENT_DATE
    AND (lp.effective_to IS NULL OR lp.effective_to >= CURRENT_DATE)
    AND EXISTS (
        SELECT 1 
        FROM hire_termination_history hth
        WHERE hth.personnel_id = $2
        AND hth.termination_date IS NULL
        AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, hth.hire_date)) >= lp.years_of_service
    )
`, [leaveTypeId, personnelId]);

if (!leaveType.is_event_based && policyCheck.rows.length === 0) {
    throw new Error('Bu izin türü için uygun bir izin politikası bulunamadı');
}

const policy = policyCheck.rows[0];
    
            // 4. İzin Koşullarının Kontrolü
            const conditionsQuery = `
                SELECT 
                    ltc.id as condition_id,
                    ltc.required_value,
                    ltc.error_message,
                    lct.code as condition_type_code,
                    lct.table_name,
                    lct.column_name,
                    lct.data_type,
                    co.code as operator_code,
                    co.symbol as operator_symbol
                FROM new_leave_type_conditions ltc
                JOIN new_leave_condition_types lct ON ltc.condition_type_id = lct.id
                JOIN new_comparison_operators co ON ltc.comparison_operator_id = co.id
                WHERE ltc.leave_type_id = $1 
                AND ltc.is_active = true
                AND lct.is_active = true
                AND co.is_active = true
            `;
    
            const conditions = await client.query(conditionsQuery, [leaveTypeId]);
    
            for (const condition of conditions.rows) {
                console.log('Checking condition:', condition);
    
                let dataQuery;
                let queryParams;
    
                if (condition.table_name === 'personnel') {
                    dataQuery = `
                        SELECT ${condition.column_name}::text as value
                        FROM ${condition.table_name}
                        WHERE id = $1
                    `;
                    queryParams = [personnelId];
                } else {
                    dataQuery = `
                        SELECT ${condition.column_name}::text as value
                        FROM ${condition.table_name}
                        WHERE personnel_id = $1
                    `;
                    queryParams = [personnelId];
                }
    
                console.log('Executing query:', dataQuery, 'with params:', queryParams);
    
                const dataResult = await client.query(dataQuery, queryParams);
    
                if (!dataResult.rows.length) {
                    throw new Error(
                        `${condition.table_name} tablosunda personel kaydı bulunamadı (ID: ${personnelId})`
                    );
                }
    
                let actualValue = dataResult.rows[0].value;
                let requiredValue = condition.required_value;
    
                // Veri tipine göre değer dönüşümü ve karşılaştırma
                if (condition.data_type.toUpperCase() === 'STRING' || 
                    condition.data_type.toUpperCase().includes('CHARACTER')) {
                    actualValue = actualValue ? actualValue.replace(/['"]/g, '').trim().toUpperCase() : '';
                    requiredValue = requiredValue ? requiredValue.replace(/['"]/g, '').trim().toUpperCase() : '';
                } else if (condition.data_type.toUpperCase() === 'BOOLEAN') {
                    actualValue = actualValue === 't' || actualValue === 'true' || actualValue === '1';
                    requiredValue = requiredValue === 'true' || requiredValue === 't' || requiredValue === '1';
                } else if (condition.data_type.toUpperCase().includes('DATE')) {
                    actualValue = new Date(actualValue);
                    requiredValue = new Date(requiredValue);
                }
    
                console.log('Comparing values:', {
                    actual: actualValue,
                    required: requiredValue,
                    operator: condition.operator_code
                });
    
                let isConditionMet = false;
    
                switch (condition.operator_code) {
                    case 'EQ':
                        isConditionMet = actualValue === requiredValue;
                        break;
                    case 'NE':
                        isConditionMet = actualValue !== requiredValue;
                        break;
                    case 'GT':
                        isConditionMet = actualValue > requiredValue;
                        break;
                    case 'GE':
                        isConditionMet = actualValue >= requiredValue;
                        break;
                    case 'LT':
                        isConditionMet = actualValue < requiredValue;
                        break;
                    case 'LE':
                        isConditionMet = actualValue <= requiredValue;
                        break;
                    case 'IN':
                        let validValues = Array.isArray(requiredValue) 
                            ? requiredValue 
                            : requiredValue.split(',').map(v => v.trim().toUpperCase());
                        isConditionMet = validValues.includes(actualValue);
                        break;
                    case 'NOT_IN':
                        let invalidValues = Array.isArray(requiredValue)
                            ? requiredValue
                            : requiredValue.split(',').map(v => v.trim().toUpperCase());
                        isConditionMet = !invalidValues.includes(actualValue);
                        break;
                }
    
                if (!isConditionMet) {
                    throw new Error(condition.error_message || 
                        `${condition.table_name} tablosundaki ${condition.column_name} değeri uygun değil`);
                }
            }
    
            // 5. İzin Bakiyesi Kontrolü (Event-based olmayan izinler için)
            if (!leaveType.is_event_based) {
                const balanceCheck = await client.query(`
                    SELECT 
                        COALESCE(total_days, 0) as total_days,
                        COALESCE(used_days, 0) as used_days,
                        (COALESCE(total_days, 0) - COALESCE(used_days, 0)) as available_days
                    FROM leave_balances
                    WHERE personnel_id = $1 
                    AND leave_type_id = $2 
                    AND year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
                `, [personnelId, leaveTypeId]);
    
                if (balanceCheck.rows.length === 0) {
                    throw new Error('İzin bakiyesi bulunamadı');
                }
    
                const balance = balanceCheck.rows[0];
                
                if (balance.available_days <= 0) {
                    throw new Error(`Yetersiz izin bakiyesi: ${balance.available_days} gün`);
                }
            }
    
         // 6. Çakışan İzin Kontrolü
         const overlapQuery = `
         SELECT COUNT(*) as overlap_count
         FROM leave_requests
         WHERE personnel_id = $1
         AND status != 'Rejected'
         AND (
             ($2 BETWEEN start_date AND end_date)
             OR ($3 BETWEEN start_date AND end_date)
             OR (start_date BETWEEN $2 AND $3)
             OR (end_date BETWEEN $2 AND $3)
         )
     `;
     
     const overlapCheck = await client.query(overlapQuery, [personnelId, startDate, endDate]);
     
     if (overlapCheck.rows[0].overlap_count > 0) {
         throw new Error('Bu tarih aralığında başka bir izin talebiniz bulunmaktadır');
     }
            return {
                eligible: true,
                policy: policy || null,
                leaveType: leaveType,
                personnel: {
                    id: personnel.id,
                    yearsOfService: yearsOfService
                },
                maxDays: leaveType.is_event_based ? leaveType.max_days : policy.days_entitled
            };
    
        } catch (error) {
            console.error('Eligibility check error:', {
                error: error.message,
                stack: error.stack,
                personnelId,
                leaveTypeId
            });
            throw error;
        } finally {
            client.release();
        }
    }

    static async allocateLeaveByType(personnelId, leaveTypeId) {
        const client = await pool.connect();
        try {
            // İzin türünü getir
            const leaveType = await client.query(`
                SELECT 
                    id, 
                    code, 
                    calculation_method_id,
                    is_event_based,
                    max_days,
                    renewal_period_id
                FROM new_leave_types
                WHERE id = $1
            `, [leaveTypeId]);

            if (!leaveType.rows.length) {
                throw new Error('Leave type not found');
            }

            const type = leaveType.rows[0];

            // Olay bazlı izinler için bakiye oluşturma kontrolü
            if (type.is_event_based) {
                return await this.handleEventBasedLeave(personnelId, type);
            }

            // Hesaplama yöntemine göre işlem yap
            switch (type.calculation_method_id) {
                case 1: // Sabit gün
                    return await this.allocateFixedLeave(personnelId, leaveTypeId, type.max_days);
                
                case 2: // Kıdeme göre hesaplama
                    return await this.calculateAnnualLeave(personnelId, leaveTypeId);
                
                default:
                    throw new Error('Invalid calculation method');
            }
        } catch (error) {
            console.error('Error allocating leave:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // services/leaveAllocationService.js içinde
static async handleEventBasedLeave(personnelId, leaveType) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Bakiye kontrolü
        const existingBalance = await client.query(`
            SELECT * FROM leave_balances
            WHERE personnel_id = $1 
            AND leave_type_id = $2
            AND year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
        `, [personnelId, leaveType.id]);

        if (existingBalance.rows.length === 0) {
            // Yeni bakiye oluştur
            await client.query(`
                INSERT INTO leave_balances 
                (personnel_id, leave_type_id, year, total_days, used_days)
                VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE)::integer, $3, 0)
            `, [personnelId, leaveType.id, leaveType.max_days]);
        }

        await client.query('COMMIT');
        return {
            success: true,
            message: 'Event based leave balance created/updated',
            days: leaveType.max_days
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

 

    // Çalışma süresine göre izin hakkını hesapla
    static async calculateLeaveEntitlement(leaveTypeId, yearsOfService) {
        try {
            // Tüm izin politikalarını al
            const policies = await pool.query(
                `SELECT years_of_service, days_entitled 
                FROM leave_policies 
                WHERE leave_type_id = $1 
                ORDER BY years_of_service ASC`,
                [leaveTypeId]
            );
    
            if (policies.rows.length === 0) {
                return 0;
            }
    
            let totalEntitlement = 0;
            let remainingYears = yearsOfService;
            let currentPolicyIndex = 0;
    
            // Her politika aralığı için hesaplama yap
            while (remainingYears > 0 && currentPolicyIndex < policies.rows.length) {
                const currentPolicy = policies.rows[currentPolicyIndex];
                const nextPolicy = policies.rows[currentPolicyIndex + 1];
                
                let yearsInThisBracket;
                if (nextPolicy) {
                    yearsInThisBracket = Math.min(
                        remainingYears,
                        nextPolicy.years_of_service - currentPolicy.years_of_service
                    );
                } else {
                    yearsInThisBracket = remainingYears;
                }
    
                totalEntitlement += yearsInThisBracket * currentPolicy.days_entitled;
                remainingYears -= yearsInThisBracket;
                currentPolicyIndex++;
            }
    
            if (remainingYears > 0 && policies.rows.length > 0) {
                const lastPolicy = policies.rows[policies.rows.length - 1];
                totalEntitlement += remainingYears * lastPolicy.days_entitled;
            }
    
            return Math.floor(totalEntitlement);
        } catch (error) {
            console.error('Error calculating leave entitlement:', error);
            throw error;
        }
    }

    // Debug ve test için politika bilgilerini getir
    static async getLeavePoliciesToDebug(leaveTypeId) {
        try {
            const policies = await pool.query(
                `SELECT years_of_service, days_entitled 
                FROM leave_policies 
                WHERE leave_type_id = $1 
                ORDER BY years_of_service ASC`,
                [leaveTypeId]
            );
            
            return policies.rows;
        } catch (error) {
            console.error('Error fetching leave policies:', error);
            throw error;
        }
    }

    // Personel için izin bakiyesi oluştur veya güncelle
    static async allocateLeave(personnelId, leaveTypeId, totalDays, year) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mevcut bakiyeyi kontrol et
            const existingBalance = await client.query(
                `SELECT * FROM annual_leave_balance 
                WHERE personnel_id = $1 
                AND leave_type_id = $2 
                AND year = $3`,
                [personnelId, leaveTypeId, year]
            );

            if (existingBalance.rows.length === 0) {
                // Yeni bakiye oluştur
                await client.query(
                    `INSERT INTO annual_leave_balance 
                    (personnel_id, leave_type_id, year, total_days, used_days, remaining_days)
                    VALUES ($1, $2, $3, $4, 0, $4)`,
                    [personnelId, leaveTypeId, year, totalDays]
                );
            } else {
                // Mevcut bakiyeyi güncelle
                const currentUsedDays = existingBalance.rows[0].used_days;
                await client.query(
                    `UPDATE annual_leave_balance 
                    SET total_days = $4,
                        remaining_days = $4 - used_days
                    WHERE personnel_id = $1 
                    AND leave_type_id = $2 
                    AND year = $3`,
                    [personnelId, leaveTypeId, year, totalDays]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Tüm personel için izin haklarını güncelle
    static async updateAllPersonnelLeaves() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Aktif çalışanları getir (termination_date'i null olanlar)
            const personnelResult = await client.query(
                `SELECT DISTINCT p.id 
                 FROM personnel p
                 INNER JOIN hire_termination_history hth ON p.id = hth.personnel_id
                 WHERE hth.termination_date IS NULL`
            );

            if (personnelResult.rows.length === 0) {
                throw new Error('No active personnel found');
            }

            const annualLeaveType = await client.query(
                "SELECT id FROM leave_types WHERE code = 'ANNUAL_LEAVE'"
            );

            if (!annualLeaveType.rows.length) {
                throw new Error('Annual leave type not found');
            }

            const annualLeaveTypeId = annualLeaveType.rows[0].id;
            const currentYear = new Date().getFullYear();
            const updatedPersonnel = [];

            for (const person of personnelResult.rows) {
                try {
                    const { years } = await this.calculateYearsOfService(person.id);
                    const entitledDays = await this.calculateLeaveEntitlement(
                        annualLeaveTypeId,
                        years
                    );

                    await this.allocateLeave(
                        person.id,
                        annualLeaveTypeId,
                        entitledDays,
                        currentYear
                    );

                    updatedPersonnel.push({
                        personnelId: person.id,
                        years,
                        entitledDays
                    });
                } catch (error) {
                    console.error(`Error updating personnel ${person.id}:`, error);
                }
            }

            await client.query('COMMIT');
            return { 
                success: true, 
                message: 'Leave balances updated successfully',
                year: currentYear,
                updatedCount: updatedPersonnel.length,
                details: updatedPersonnel
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating leave balances:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Yeni personel için izin hakları oluştur
// Yeni personel için izin hakları oluştur
static async createInitialLeaveBalances(personnelId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Personelin işe giriş tarihini kontrol et
        const hireRecord = await client.query(
            `SELECT hire_date 
             FROM hire_termination_history 
             WHERE personnel_id = $1 
             AND termination_date IS NULL
             ORDER BY hire_date DESC
             LIMIT 1`,
            [personnelId]
        );

        if (!hireRecord.rows.length) {
            throw new Error('No active hire record found for personnel');
        }

        const { years } = await this.calculateYearsOfService(personnelId);
        const currentYear = new Date().getFullYear();

        // Yıllık izin türünü bul
        const annualLeaveType = await client.query(
            "SELECT id FROM leave_types WHERE code = 'ANNUAL_LEAVE'"
        );

        if (!annualLeaveType.rows.length) {
            throw new Error('Annual leave type not found');
        }

        const annualLeaveTypeId = annualLeaveType.rows[0].id;
        const entitledDays = await this.calculateLeaveEntitlement(
            annualLeaveTypeId,
            years
        );

        await this.allocateLeave(
            personnelId,
            annualLeaveTypeId,
            entitledDays,
            currentYear
        );

        await client.query('COMMIT');
        return { 
            success: true, 
            message: 'Initial leave balances created successfully',
            entitledDays,
            yearsOfService: years,
            hireDate: hireRecord.rows[0].hire_date
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating initial leave balances:', error);
        throw error;
    } finally {
        client.release();
    }
}




static async resetAndRecalculateAllLeaveBalances() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Mevcut yıla ait izin bakiyelerini temizle
        await client.query(`
            DELETE FROM leave_balances 
            WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
            AND leave_type_id = (SELECT id FROM leave_types WHERE code = 'ANNUAL_LEAVE')
        `);

        // 2. Aktif personeli getir
        const personnelResult = await client.query(`
            SELECT DISTINCT p.id, p.first_name, p.last_name, hth.hire_date
            FROM personnel p
            INNER JOIN hire_termination_history hth ON p.id = hth.personnel_id
            WHERE hth.termination_date IS NULL
            ORDER BY p.first_name, p.last_name
        `);

        // 3. Yıllık izin türünü bul
        const annualLeaveType = await client.query(
            "SELECT id FROM leave_types WHERE code = 'ANNUAL_LEAVE'"
        );

        if (!annualLeaveType.rows.length) {
            throw new Error('Annual leave type not found');
        }

        const annualLeaveTypeId = annualLeaveType.rows[0].id;
        const currentYear = new Date().getFullYear();
        const results = [];

        // 4. Her personel için yeni bakiye hesapla
        for (const person of personnelResult.rows) {
            const { years } = await this.calculateYearsOfService(person.id);
            const entitledDays = await this.calculateLeaveEntitlement(
                annualLeaveTypeId,
                years
            );

            // Yeni bakiye oluştur
            await client.query(`
                INSERT INTO leave_balances 
                (personnel_id, leave_type_id, year, total_days, used_days)
                VALUES ($1, $2, $3, $4, 0)
            `, [person.id, annualLeaveTypeId, currentYear, entitledDays]);

            results.push({
                personnelId: person.id,
                name: `${person.first_name} ${person.last_name}`,
                yearsOfService: years,
                entitledDays: entitledDays
            });
        }

        await client.query('COMMIT');
        return { 
            success: true, 
            message: 'All leave balances have been reset and recalculated',
            year: currentYear,
            results: results
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting leave balances:', error);
        throw error;
    } finally {
        client.release();
    }
}

static async allocateLeave(personnelId, leaveTypeId, totalDays, year) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Mevcut bakiyeyi kontrol et
        const existingBalance = await client.query(
            `SELECT * FROM leave_balances 
             WHERE personnel_id = $1 
             AND leave_type_id = $2 
             AND year = $3`,
            [personnelId, leaveTypeId, year]
        );

        if (existingBalance.rows.length === 0) {
            // Yeni bakiye oluştur
            await client.query(
                `INSERT INTO leave_balances 
                 (personnel_id, leave_type_id, year, total_days, used_days)
                 VALUES ($1, $2, $3, $4, 0)`,
                [personnelId, leaveTypeId, year, totalDays]
            );
        } else {
            // Mevcut bakiyeyi güncelle
            await client.query(
                `UPDATE leave_balances 
                 SET total_days = $4
                 WHERE personnel_id = $1 
                 AND leave_type_id = $2 
                 AND year = $3`,
                [personnelId, leaveTypeId, year, totalDays]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Bakiye bilgilerini getir
static async getLeaveBalance(personnelId) {
    try {
        const result = await pool.query(`
            SELECT 
                lb.id,
                lb.year,
                lt.name as leave_type_name,
                lt.code as leave_type_code,
                lb.total_days,
                lb.used_days,
                (lb.total_days - lb.used_days) as remaining_days
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            WHERE lb.personnel_id = $1 
            AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
        `, [personnelId]);

        return result.rows;
    } catch (error) {
        console.error('Error fetching leave balance:', error);
        throw error;
    }
}
}

module.exports = LeaveAllocationService;