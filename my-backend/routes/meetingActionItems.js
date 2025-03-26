// routes/actionItems.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// Toplantının yapılacak işlerini getir
router.get('/meetings/:meetingId/action-items', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ma.*,
                CONCAT(p.first_name, ' ', p.last_name) as assigned_to_name,
                CASE 
                    WHEN ma.completed_at IS NOT NULL THEN 'completed'
                    ELSE ma.status 
                END as current_status
            FROM meeting_action_items ma
            LEFT JOIN personnel p ON p.id = ma.assigned_to
            WHERE ma.meeting_id = $1
            ORDER BY 
                CASE 
                    WHEN ma.priority = 'high' THEN 1
                    WHEN ma.priority = 'medium' THEN 2
                    WHEN ma.priority = 'low' THEN 3
                    ELSE 4
                END,
                ma.due_date ASC
        `, [req.params.meetingId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching action items:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yeni yapılacak iş ekle
router.post('/meetings/:meetingId/action-items', authenticateToken, async (req, res) => {
    const {
        description,
        assigned_to,
        due_date,
        priority
    } = req.body;

    try {
        const result = await pool.query(`
            INSERT INTO meeting_action_items (
                meeting_id,
                description,
                assigned_to,
                due_date,
                priority,
                status,
                created_at
            )
            VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
            RETURNING *
        `, [
            req.params.meetingId,
            description,
            assigned_to,
            due_date,
            priority
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating action item:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yapılacak iş durumunu güncelle
router.put('/meetings/:meetingId/action-items/:itemId/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE meeting_action_items
            SET 
                status = $1,
                completed_at = CASE 
                    WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END
            WHERE id = $2 AND meeting_id = $3
            RETURNING *
        `, [status, req.params.itemId, req.params.meetingId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Action item not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating action item:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yapılacak işi sil
router.delete('/meetings/:meetingId/action-items/:itemId', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM meeting_action_items WHERE id = $1 AND meeting_id = $2 RETURNING id',
            [req.params.itemId, req.params.meetingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Action item not found' });
        }

        res.json({ message: 'Action item deleted successfully' });
    } catch (err) {
        console.error('Error deleting action item:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;