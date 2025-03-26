// routes/shiftLeaveRequests.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// İzin talebi oluşturma
// İzin talebi oluşturma
router.post('/leave-requests', authenticateToken, async (req, res) => {
    try {
      const { leave_date, reason } = req.body;
      const personnel_id = req.user.personnelId;
  
      const result = await pool.query(
        `INSERT INTO shift_leave_requests 
         (personnel_id, request_date, leave_date, reason, status)
         VALUES ($1, CURRENT_DATE, $2, $3, 'pending')
         RETURNING *`,
        [personnel_id, leave_date, reason]
      );
  
      // İlgili personel bilgilerini de ekleyelim
      const fullResult = await pool.query(`
        SELECT slr.*, 
               p.first_name, 
               p.last_name
        FROM shift_leave_requests slr
        JOIN personnel p ON slr.personnel_id = p.id
        WHERE slr.id = $1
      `, [result.rows[0].id]);
  
      res.status(201).json(fullResult.rows[0]);
    } catch (error) {
      console.error('Error creating leave request:', error);
      res.status(500).json({ error: error.message });
    }
  });

// İzin taleplerini listeleme (yönetici için)
// İzin taleplerini listeleme
router.get('/leave-requests', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT slr.*, 
               p.first_name, 
               p.last_name,
               ap.first_name as approver_first_name, 
               ap.last_name as approver_last_name
        FROM shift_leave_requests slr
        JOIN personnel p ON slr.personnel_id = p.id
        LEFT JOIN personnel ap ON slr.approved_by = ap.id
        ORDER BY slr.created_at DESC
      `);
  
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

// Kişisel izin taleplerini listeleme
// Kişisel izin taleplerini listeleme
router.get('/my-leave-requests', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT slr.*,
               p.first_name,
               p.last_name,
               ap.first_name as approver_first_name,
               ap.last_name as approver_last_name
        FROM shift_leave_requests slr
        JOIN personnel p ON slr.personnel_id = p.id
        LEFT JOIN personnel ap ON slr.approved_by = ap.id
        WHERE slr.personnel_id = $1
        ORDER BY slr.created_at DESC
      `, [req.user.personnelId]);
  
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching personal leave requests:', error);
      res.status(500).json({ error: error.message });
    }
  });

// İzin talebini onaylama/reddetme
// İzin talebini onaylama/reddetme
router.put('/leave-requests/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const approved_by = req.user.personnelId;
  
    try {
      console.log('Updating leave request:', { id, status, approved_by }); // Debug için
  
      const result = await pool.query(
        `UPDATE shift_leave_requests 
         SET status = $1, 
             approved_by = $2,
             approved_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, approved_by, id]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'İzin talebi bulunamadı' });
      }
  
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating leave request:', error);
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;