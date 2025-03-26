const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET: Eğitim bilgilerini getir
router.get('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  try {
    const result = await pool.query('SELECT * FROM personnel_education WHERE personnel_id = $1', [personnelId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching education details:', err);
    res.status(500).json({ error: 'Failed to fetch education details' });
  }
});

// PUT: Eğitim bilgilerini güncelle
router.put('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  const { education_level, graduation_year } = req.body;

  try {
    // Önce kaydın olup olmadığını kontrol edin
    const checkResult = await pool.query('SELECT * FROM personnel_education WHERE personnel_id = $1', [personnelId]);
    
    if (checkResult.rows.length === 0) {
      // Kayıt yoksa yeni bir satır ekleyin
      const insertResult = await pool.query(
        'INSERT INTO personnel_education (personnel_id, education_level, graduation_year) VALUES ($1, $2, $3) RETURNING *',
        [personnelId, education_level, graduation_year]
      );
      res.status(201).json(insertResult.rows[0]); // Yeni kayıt eklendi
    } else {

    const updateResult = await pool.query(
      'UPDATE personnel_education SET education_level = $1, graduation_year = $2 WHERE personnel_id = $3 RETURNING *',
      [education_level, graduation_year, personnelId]
    );
    res.status(200).json(updateResult.rows[0]);
    }
  } catch (err) {
    console.error('Error updating education details:', err);
    res.status(500).json({ error: 'Failed to update education details' });
  }
});

module.exports = router;
