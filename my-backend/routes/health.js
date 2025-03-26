const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET: Sağlık bilgilerini getir
router.get('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  try {
    const result = await pool.query('SELECT * FROM personnel_health WHERE personnel_id = $1', [personnelId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching health details:', err);
    res.status(500).json({ error: 'Failed to fetch health details' });
  }
});

// PUT: Sağlık bilgilerini güncelle


  router.put('/:personnelId', async (req, res) => {
    console.log(`Updating health information for personnelId: ${req.params.personnelId}`);
    console.log(`Received data: `, req.body);
    const personnelId = req.params.personnelId;
    const { blood_type, disability_status } = req.body;
  
    try {
      // Önce kaydın olup olmadığını kontrol edin
      const checkResult = await pool.query('SELECT * FROM personnel_health WHERE personnel_id = $1', [personnelId]);
  
      if (checkResult.rows.length === 0) {
        // Kayıt yoksa yeni bir satır ekleyin
        const insertResult = await pool.query(
          'INSERT INTO personnel_health (personnel_id, blood_type, disability_status) VALUES ($1, $2, $3) RETURNING *',
          [personnelId, blood_type, disability_status]
        );
        res.status(201).json(insertResult.rows[0]); // Yeni kayıt eklendi
      } else {
        // Kayıt varsa güncelleme yapın
        const updateResult = await pool.query(
          'UPDATE personnel_health SET blood_type = $1, disability_status = $2 WHERE personnel_id = $3 RETURNING *',
          [blood_type, disability_status, personnelId]
        );
        res.status(200).json(updateResult.rows[0]); // Kayıt güncellendi
      }
    } catch (err) {
      console.error('Error updating/creating health details:', err);
      res.status(500).json({ error: 'Failed to update/create health details' });
    }
  });
  
  

module.exports = router;
