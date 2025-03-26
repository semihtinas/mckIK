const cron = require('node-cron');
const LeaveAllocationService = require('../services/leaveAllocationService');
const pool = require('../config/db');

class LeaveAllocationScheduler {
    // Her gün çalışacak ana kontrol fonksiyonu
    static scheduleAllLeaveChecks() {
        // Her gün gece yarısı çalışır
        cron.schedule('0 0 * * *', async () => {
            console.log('Starting daily leave allocation checks...');
            try {
                await this.checkYearlyRenewals();
                await this.checkServiceBasedRenewals();
                await this.checkMonthlyRenewals();
                console.log('Daily leave allocation checks completed');
            } catch (error) {
                console.error('Error in daily leave checks:', error);
            }
        });
    }

    // Yıllık yenilenen izinleri kontrol et (YEARLY)
    static async checkYearlyRenewals() {
        const client = await pool.connect();
        try {
            const today = new Date();
            const query = `
                UPDATE leave_balances lb
                SET 
                    total_days = COALESCE(
                        (
                            SELECT days_entitled 
                            FROM leave_policies lp
                            WHERE lp.leave_type_id = lb.leave_type_id
                            AND lp.years_of_service <= (
                                SELECT EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))
                                FROM hire_termination_history
                                WHERE personnel_id = lb.personnel_id
                                AND termination_date IS NULL
                                ORDER BY hire_date DESC
                                LIMIT 1
                            )
                            ORDER BY years_of_service DESC
                            LIMIT 1
                        ), 
                        lb.total_days
                    ),
                    used_days = 0,
                    last_calculated_at = CURRENT_TIMESTAMP
                FROM new_leave_types nlt
                JOIN new_leave_renewal_periods rp ON nlt.renewal_period_id = rp.id
                WHERE lb.leave_type_id = nlt.id
                AND rp.renewal_type = 'YEARLY'
                AND rp.renewal_month = $1
                AND rp.renewal_day = $2
                AND nlt.is_event_based = false
                RETURNING lb.*
            `;
            
            const result = await client.query(query, [
                today.getMonth() + 1,  // JavaScript ayları 0'dan başlar
                today.getDate()
            ]);

            console.log(`Updated ${result.rowCount} yearly leave balances`);
        } catch (error) {
            console.error('Error in yearly renewals:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // İşe giriş bazlı izinleri kontrol et (SERVICE_BASED)
    static async checkServiceBasedRenewals() {
        const client = await pool.connect();
        try {
            const query = `
                WITH eligible_personnel AS (
                    SELECT 
                        p.id as personnel_id,
                        hth.hire_date,
                        EXTRACT(YEAR FROM AGE(CURRENT_DATE, hth.hire_date)) as years_of_service
                    FROM personnel p
                    JOIN hire_termination_history hth ON p.id = hth.personnel_id
                    WHERE 
                        hth.termination_date IS NULL
                        AND EXTRACT(MONTH FROM hth.hire_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                        AND EXTRACT(DAY FROM hth.hire_date) = EXTRACT(DAY FROM CURRENT_DATE)
                )
                UPDATE leave_balances lb
                SET 
                    total_days = COALESCE(
                        (
                            SELECT days_entitled 
                            FROM leave_policies lp
                            WHERE lp.leave_type_id = lb.leave_type_id
                            AND lp.years_of_service <= ep.years_of_service
                            ORDER BY years_of_service DESC
                            LIMIT 1
                        ),
                        lb.total_days
                    ),
                    used_days = 0,
                    last_calculated_at = CURRENT_TIMESTAMP
                FROM eligible_personnel ep
                JOIN new_leave_types nlt ON lb.leave_type_id = nlt.id
                JOIN new_leave_renewal_periods rp ON nlt.renewal_period_id = rp.id
                WHERE lb.personnel_id = ep.personnel_id
                AND rp.renewal_type = 'SERVICE_BASED'
                AND nlt.is_event_based = false
                RETURNING lb.*
            `;
            
            const result = await client.query(query);
            console.log(`Updated ${result.rowCount} service-based leave balances`);
        } catch (error) {
            console.error('Error in service-based renewals:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Aylık yenilenen izinleri kontrol et (MONTHLY)
    static async checkMonthlyRenewals() {
        const client = await pool.connect();
        try {
            const query = `
                UPDATE leave_balances lb
                SET 
                    total_days = nlt.max_days,
                    used_days = 0,
                    last_calculated_at = CURRENT_TIMESTAMP
                FROM new_leave_types nlt
                JOIN new_leave_renewal_periods rp ON nlt.renewal_period_id = rp.id
                WHERE lb.leave_type_id = nlt.id
                AND rp.renewal_type = 'MONTHLY'
                AND rp.renewal_day = EXTRACT(DAY FROM CURRENT_DATE)
                AND nlt.is_event_based = false
                RETURNING lb.*
            `;
            
            const result = await client.query(query);
            console.log(`Updated ${result.rowCount} monthly leave balances`);
        } catch (error) {
            console.error('Error in monthly renewals:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = LeaveAllocationScheduler;