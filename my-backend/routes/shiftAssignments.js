// routes/shiftAssignments.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);
// routes/shiftAssignments.js

// Personnel listesi için endpoint
router.get('/department-personnel/:departmentId', authenticateToken, async (req, res) => {
    const { departmentId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.first_name,
                p.last_name,
                CONCAT(p.first_name, ' ', p.last_name) as full_name,
                d.name as department_name
            FROM personnel p
            INNER JOIN personnel_departments pd ON p.id = pd.personnel_id
            INNER JOIN departments d ON pd.department_id = d.id
            WHERE pd.department_id = $1 
            AND p.is_active = true
            ORDER BY p.first_name, p.last_name
        `, [departmentId]);

        console.log(`Found ${result.rows.length} personnel for department ${departmentId}`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Haftalık vardiyalar için endpoint
router.get('/weekly-shifts', authenticateToken, async (req, res) => {
    const { startDate, endDate, departmentId } = req.query;
    
    try {
        // Hafta başlangıcı ve bitişini ISO hafta standardına göre hesapla (Pazartesi-Pazar)
        const weekStart = dayjs(startDate).startOf('isoWeek');
        const weekEnd = dayjs(endDate).endOf('isoWeek');

        console.log('Date range:', {
            weekStart: weekStart.format('YYYY-MM-DD'),
            weekEnd: weekEnd.format('YYYY-MM-DD'),
            originalStart: startDate,
            originalEnd: endDate
        });

        const result = await pool.query(`
            SELECT 
                sa.id,
                sa.personnel_id,
                sa.assignment_date,
                sa.status,
                p.first_name,
                p.last_name,
                ss.name as shift_name,
                ss.start_time,
                ss.end_time,
                ss.color
            FROM shift_assignments sa
            JOIN personnel p ON sa.personnel_id = p.id
            JOIN shift_schedules ss ON sa.shift_schedule_id = ss.id
            JOIN personnel_departments pd ON p.id = pd.personnel_id
            WHERE sa.assignment_date BETWEEN $1 AND $2
            AND pd.department_id = $3
            AND sa.status = 'active'
            ORDER BY sa.assignment_date, ss.start_time
        `, [weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD'), departmentId]);

        console.log(`Found ${result.rows.length} shifts between ${weekStart.format('YYYY-MM-DD')} and ${weekEnd.format('YYYY-MM-DD')} for department ${departmentId}`);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Vardiya atamasını güncellemek için endpoint
router.put('/assignments/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { assignment_date, personnel_id } = req.body;

    try {
        // Veritabanında güncelleme işlemi
        const result = await pool.query(`
            UPDATE shift_assignments
            SET assignment_date = $1, personnel_id = $2
            WHERE id = $3
            RETURNING *
        `, [assignment_date, personnel_id, id]);

        if (result.rows.length === 0) {
            // Güncellenecek kayıt bulunamadı
            res.status(404).json({ error: 'Shift assignment not found' });
        } else {
            // Başarılı güncelleme
            res.status(200).json({ message: 'Shift assignment updated successfully', data: result.rows[0] });
        }
    } catch (error) {
        console.error('Error updating shift assignment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/assignments/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM shift_assignments WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Shift assignment not found' });
        } else {
            res.status(200).json({ message: 'Shift assignment deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting shift assignment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Vardiya atamasını almak için endpoint
router.get('/assignments/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM shift_assignments WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Shift assignment not found' });
        } else {
            res.status(200).json(result.rows[0]);
        }
    } catch (error) {
        console.error('Error fetching shift assignment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Yeni vardiya ataması oluşturmak için endpoint
router.post('/assignments', authenticateToken, async (req, res) => {
    const { shift_schedule_id, personnel_id, assignment_date, status } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO shift_assignments (shift_schedule_id, personnel_id, assignment_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [shift_schedule_id, personnel_id, assignment_date, status]
        );

        res.status(201).json({ message: 'Shift assignment created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error creating shift assignment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Yeni vardiya ataması oluşturmak için endpoint
router.post('/assignments', authenticateToken, async (req, res) => {
    const { shift_schedule_id, personnel_id, assignment_date, status } = req.body;
  
    try {
      const result = await pool.query(
        'INSERT INTO shift_assignments (shift_schedule_id, personnel_id, assignment_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [shift_schedule_id, personnel_id, assignment_date, status]
      );
  
      res.status(201).json({ message: 'Shift assignment created successfully', data: result.rows[0] });
    } catch (error) {
      console.error('Error creating shift assignment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  


module.exports = router;