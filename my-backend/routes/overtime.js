const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// Mesai kaydı oluşturma
router.post('/overtime', authMiddleware, async (req, res) => {
    const { start_time, end_time, description, reason } = req.body;
    const personnel_id = req.user.personnelId;

    try {
        // Toplam saat hesaplama
        const start = new Date(start_time);
        const end = new Date(end_time);
        const total_hours = (end - start) / (1000 * 60 * 60);

        const result = await pool.query(
            `INSERT INTO overtime_records 
            (personnel_id, start_time, end_time, description, total_hours, reason) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *`,
            [personnel_id, start_time, end_time, description, total_hours, reason]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mesai kaydı oluşturma hatası:', error);
        res.status(500).json({ error: 'Mesai kaydı oluşturulurken bir hata oluştu' });
    }
});

// Mesai kayıtlarını listele
router.get('/overtime', authMiddleware, async (req, res) => {
    const personnel_id = req.user.personnelId;
    
    try {
        const query = `
            SELECT 
                o.*,
                p.first_name || ' ' || p.last_name as personnel_name
            FROM overtime_records o
            LEFT JOIN personnel p ON o.personnel_id = p.id
            WHERE o.personnel_id = $1
            ORDER BY o.created_at DESC
        `;
        
        const result = await pool.query(query, [personnel_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Mesai kayıtları listesi hatası:', error);
        res.status(500).json({ error: 'Mesai kayıtları listelenirken bir hata oluştu' });
    }
});

// Mesai kaydı onaylama/reddetme
router.put('/overtime/:id/status', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const approved_by = req.user.personnelId;

    try {
        const result = await pool.query(
            `UPDATE overtime_records 
            SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP 
            WHERE id = $3 
            RETURNING *`,
            [status, approved_by, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mesai kaydı durum güncelleme hatası:', error);
        res.status(500).json({ error: 'Mesai kaydı durumu güncellenirken bir hata oluştu' });
    }
});

router.post('/overtime/bulk', authMiddleware, async (req, res) => {
    const overtimeRecords = req.body;
    
    try {
        // Transaction başlat
        await pool.query('BEGIN');
        
        const results = [];
        for (const record of overtimeRecords) {
            const { personnel_id, start_time, end_time, description, reason, hours } = record;
            
            // Toplam saat hesaplama (ya direkt verilen hours değerini ya da tarihler arası farkı kullan)
            const total_hours = hours || (new Date(end_time) - new Date(start_time)) / (1000 * 60 * 60);
            
            const result = await pool.query(
                `INSERT INTO overtime_records 
                (personnel_id, start_time, end_time, description, total_hours, reason) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING *`,
                [personnel_id, start_time, end_time, description, total_hours, reason]
            );
            
            results.push(result.rows[0]);
        }
        
        // Transaction'ı commit et
        await pool.query('COMMIT');
        
        res.json(results);
    } catch (error) {
        // Hata durumunda rollback yap
        await pool.query('ROLLBACK');
        console.error('Toplu mesai kaydı oluşturma hatası:', error);
        res.status(500).json({ error: 'Mesai kayıtları oluşturulurken bir hata oluştu' });
    }
});

router.post('/overtime', authMiddleware, async (req, res) => {
    const { start_time, end_time, description, reason } = req.body;
    const personnel_id = req.user.personnelId;

    try {
        // Toplam saat hesaplama
        const start = new Date(start_time);
        const end = new Date(end_time);
        const total_hours = (end - start) / (1000 * 60 * 60);

        const result = await pool.query(
            `INSERT INTO overtime_records 
            (personnel_id, start_time, end_time, description, total_hours, reason) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *`,
            [personnel_id, start_time, end_time, description, total_hours, reason]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mesai kaydı oluşturma hatası:', error);
        res.status(500).json({ error: 'Mesai kaydı oluşturulurken bir hata oluştu' });
    }
});

// Mesai kayıtlarını listele
router.get('/overtime', authMiddleware, async (req, res) => {
    const personnel_id = req.user.personnelId;
    
    try {
        const query = `
            SELECT 
                o.*,
                p.first_name || ' ' || p.last_name as personnel_name
            FROM overtime_records o
            LEFT JOIN personnel p ON o.personnel_id = p.id
            WHERE o.personnel_id = $1
            ORDER BY o.created_at DESC
        `;
        
        const result = await pool.query(query, [personnel_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Mesai kayıtları listesi hatası:', error);
        res.status(500).json({ error: 'Mesai kayıtları listelenirken bir hata oluştu' });
    }
});

// Mesai kaydı onaylama/reddetme
router.put('/overtime/:id/status', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const approved_by = req.user.personnelId;

    try {
        const result = await pool.query(
            `UPDATE overtime_records 
            SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP 
            WHERE id = $3 
            RETURNING *`,
            [status, approved_by, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mesai kaydı durum güncelleme hatası:', error);
        res.status(500).json({ error: 'Mesai kaydı durumu güncellenirken bir hata oluştu' });
    }
});


// Haftalık mesai kayıtlarını getir
router.get('/overtime/weekly/:departmentId', authMiddleware, async (req, res) => {
    const { departmentId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const result = await pool.query(`
            SELECT 
                o.*,
                p.first_name,
                p.last_name,
                p.id as personnel_id
            FROM overtime_records o
            JOIN personnel p ON o.personnel_id = p.id
            JOIN personnel_departments pd ON p.id = pd.personnel_id
            WHERE pd.department_id = $1
            AND date(o.start_time) >= $2
            AND date(o.end_time) <= $3
            ORDER BY p.first_name, p.last_name, o.start_time
        `, [departmentId, startDate, endDate]);

        res.json(result.rows);
    } catch (error) {
        console.error('Haftalık mesai kayıtları hatası:', error);
        res.status(500).json({ error: 'Mesai kayıtları alınırken bir hata oluştu' });
    }
});

module.exports = router;