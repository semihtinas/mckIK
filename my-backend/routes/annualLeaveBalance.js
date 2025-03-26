const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// İzin bakiyelerini getir
// routes/leave_balances.js
// routes/leave_balances.js
router.get('/leave-balance/:personnelId', async (req, res) => {
    const { personnelId } = req.params;
    try {
        console.log('Fetching leave balance for personnel:', personnelId);
        
        // Önce personel için kayıt var mı kontrol edelim
        const checkBalance = await pool.query(`
            SELECT COUNT(*) 
            FROM leave_balances 
            WHERE personnel_id = $1 
            AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
            [personnelId]
        );

        // Eğer kayıt yoksa, otomatik olarak oluşturalım
        if (checkBalance.rows[0].count === '0') {
            // Her izin türü için bakiye oluştur
            const leaveTypes = await pool.query('SELECT id FROM leave_type');
            
            for (const type of leaveTypes.rows) {
                // İzin politikasından hak edilen gün sayısını al
                const policyResult = await pool.query(`
                    SELECT days_entitled 
                    FROM leave_policy 
                    WHERE leave_type_id = $1 
                    ORDER BY years_of_service ASC 
                    LIMIT 1`,
                    [type.id]
                );

                if (policyResult.rows.length > 0) {
                    await pool.query(`
                        INSERT INTO leave_balances 
                        (personnel_id, leave_type_id, year, total_days, days_used)
                        VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE)::integer, $3, 0)
                        ON CONFLICT (personnel_id, leave_type_id, year) 
                        DO NOTHING`,
                        [personnelId, type.id, policyResult.rows[0].days_entitled]
                    );
                }
            }
        }

        // Güncel bakiyeleri getir
        const result = await pool.query(`
            SELECT 
                alb.id,
                alb.year,
                lt.name as leave_type_name,
                alb.total_days,
                alb.days_used,
                (alb.total_days - alb.days_used) as remaining_days,
                lt.id as leave_type_id
            FROM leave_balances alb
            JOIN leave_type lt ON alb.leave_type_id = lt.id
            WHERE alb.personnel_id = $1 
            AND alb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
        `, [personnelId]);
        
        console.log('Query result:', result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error('Detailed error in fetching leave balance:', err);
        res.status(500).json({ 
            error: 'Server error', 
            details: err.message,
            stack: err.stack 
        });
    }
});

// Yıllık izin bakiyesi oluştur/güncelle
router.post('/leave-balance/initialize', async (req, res) => {
    const { personnel_id, year } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Her izin türü için bakiye oluştur
        const leaveTypes = await client.query('SELECT * FROM leave_type');
        
        for (const leaveType of leaveTypes.rows) {
            // İzin politikasından hak edilen gün sayısını al
            const policyResult = await client.query(`
                SELECT days_entitled 
                FROM leave_policy 
                WHERE leave_type_id = $1 
                ORDER BY years_of_service DESC 
                LIMIT 1
            `, [leaveType.id]);

            if (policyResult.rows.length > 0) {
                const totalDays = policyResult.rows[0].days_entitled;
                
                // Mevcut bakiyeyi kontrol et
                const existingBalance = await client.query(`
                    SELECT id FROM leave_balances 
                    WHERE personnel_id = $1 AND leave_type_id = $2 AND year = $3
                `, [personnel_id, leaveType.id, year]);

                if (existingBalance.rows.length === 0) {
                    // Yeni bakiye oluştur
                    await client.query(`
                        INSERT INTO leave_balances 
                        (personnel_id, leave_type_id, year, total_days, used_days, remaining_days)
                        VALUES ($1, $2, $3, $4, 0, $4)
                    `, [personnel_id, leaveType.id, year, totalDays]);
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Leave balance initialized successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing leave balance:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// İzin kullanımını güncelle
router.put('/leave-balance/update', async (req, res) => {
    const { personnel_id, leave_type_id, used_days } = req.body;
    const year = new Date().getFullYear();

    try {
        const result = await pool.query(`
            UPDATE leave_balances 
            SET used_days = used_days + $1,
                remaining_days = total_days - (used_days + $1)
            WHERE personnel_id = $2 
            AND leave_type_id = $3 
            AND year = $4
            RETURNING *
        `, [used_days, personnel_id, leave_type_id, year]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating leave balance:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;