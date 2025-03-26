// publicHoliday.js

const express = require('express');
const pool = require('../config/db');  // Veritabanı bağlantısı
const router = express.Router();

// Resmi tatil günlerini ekleyen API (POST)
router.post('/public-holidays', async (req, res) => {
  const holidays = req.body;

  try {
    for (const holiday of holidays) {
      await pool.query(
        'INSERT INTO public_holidays (holiday_name, holiday_date) VALUES ($1, $2)',
        [holiday.holiday_name, holiday.holiday_date]
      );
    }

    res.status(201).json({ message: 'Public holidays added successfully' });
  } catch (error) {
    console.error('Error adding public holidays:', error);
    res.status(500).json({ error: 'Failed to add public holidays' });
  }
});

// Resmi tatil günlerini getiren API (GET)
router.get('/public-holidays', async (req, res) => {
  try {
    const result = await pool.query('SELECT holiday_name, holiday_date FROM public_holidays ORDER BY holiday_date ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching public holidays:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
