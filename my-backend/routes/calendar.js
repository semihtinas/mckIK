const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// Tüm takvim verilerini getir
router.get('/calendar/events', authenticateToken, async (req, res) => {
    try {
        const events = await pool.query(`
            SELECT * FROM calendar_events 
            WHERE status = 'active'
            ORDER BY start_date DESC
        `);
        res.json(events.rows);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// İzinleri getir
router.get('/calendar/leaves', authenticateToken, async (req, res) => {
    try {
        const leaves = await pool.query(`
            SELECT 
                lr.id,
                lr.start_date,
                lr.end_date,
                lr.leave_type_id,
                nlt.name as leave_type,
                CONCAT(p.first_name, ' ', p.last_name) as personnel_name,
                lr.status
            FROM leave_requests lr
            JOIN personnel p ON lr.personnel_id = p.id
            JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
            WHERE lr.status = 'Approved'
            ORDER BY lr.start_date DESC
        `);
        
        console.log('Leaves data:', leaves.rows); // Debug için
        res.json(leaves.rows);
    } catch (err) {
        console.error('Error fetching leaves:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});
 

// Doğum günlerini getir
// routes/calendar.js içinde
router.get('/calendar/birthdays', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id,
                first_name,
                last_name,
                CONCAT(first_name, ' ', last_name) as full_name,
                birthdate as birth_date
            FROM personnel 
            WHERE birthdate IS NOT NULL 
            ORDER BY 
                EXTRACT(MONTH FROM birthdate),
                EXTRACT(DAY FROM birthdate)
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all birthdays:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

 // Yeni etkinlik ekle
 router.post('/calendar/events', authenticateToken, async (req, res) => {
    const { title, description, event_type, start_date, end_date, participants } = req.body;
    
    try {
      const result = await pool.query(`
        INSERT INTO calendar_events (
          title, 
          description, 
          event_type,
          start_date,
          end_date,
          participants,
          created_by,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        title,
        description,
        event_type,
        start_date,
        end_date,
        participants,
        req.user.userId,
        'active'
      ]);
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Error creating event:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Etkinlik silme
router.delete('/calendar/events/:id', 
  authenticateToken, 
  async (req, res) => {
    try {
      await pool.query(`
        UPDATE calendar_events 
        SET status = 'deleted' 
        WHERE id = $1 AND created_by = $2
      `, [req.params.id, req.user.userId]);
      
      res.json({ message: 'Event deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
});

// Etkinlik güncelleme
router.put('/calendar/events/:id', 
  authenticateToken, 
  async (req, res) => {
    const { title, description, event_type, date_range, participants } = req.body;
    
    try {
      const result = await pool.query(`
        UPDATE calendar_events 
        SET 
          title = $1,
          description = $2,
          event_type = $3,
          start_date = $4,
          end_date = $5,
          participants = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND created_by = $8
        RETURNING *
      `, [
        title,
        description,
        event_type,
        date_range[0],
        date_range[1],
        participants,
        req.params.id,
        req.user.userId
      ]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found or unauthorized' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;