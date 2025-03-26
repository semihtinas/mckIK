// leavePolicy.js

const express = require('express');
const pool = require('../config/db');  // Veritabanı bağlantısı
const router = express.Router();

// İzin politikalarını getiren API (GET)
router.get('/leave-policies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM LEAVE_POLICIES');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching leave policies:', err.message);
    res.status(500).send('Server Error');
  }
});

// İzin politikası ekleyen API (POST)
router.post('/leave-policies', async (req, res) => {
  const { leave_type_id, years_of_service, days_entitled } = req.body;
  
  if (!leave_type_id || !years_of_service || !days_entitled) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO LEAVE_POLICIES (leave_type_id, years_of_service, days_entitled) VALUES ($1, $2, $3) RETURNING *',
      [leave_type_id, years_of_service, days_entitled]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding leave policy:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
