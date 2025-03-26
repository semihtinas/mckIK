// leaveType.js

const express = require('express');
const pool = require('../config/db');  // Veritabanı bağlantısı
const router = express.Router();

// İzin türlerini getiren API
// routes/leaveType.js
router.get('/new-leave-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM new_leave_types');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leave types:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// routes/leaveType.js



// Yeni izin türü ekleme endpoint'i
router.post('/new-leave-types', async (req, res) => {
  const {
    code, name, calculation_method_id, renewal_period_id, is_paid,
    is_event_based, requires_approval, max_days, allow_negative_balance, description
  } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO new_leave_types (code, name, calculation_method_id, renewal_period_id, is_paid, 
        is_event_based, requires_approval, max_days, allow_negative_balance, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, name, calculation_method_id, renewal_period_id, is_paid, 
       is_event_based, requires_approval, max_days, allow_negative_balance, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding new leave type:', error.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;





module.exports = router;
