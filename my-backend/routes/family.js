const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET: Aile bilgilerini getir
router.get('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  try {
    const result = await pool.query('SELECT * FROM personnel_family WHERE personnel_id = $1', [personnelId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching family details:', err);
    res.status(500).json({ error: 'Failed to fetch family details' });
  }
});

// PUT: Aile bilgilerini güncelle
router.put('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  const { marital_status, number_of_children } = req.body;


  try {
    // Önce kaydın olup olmadığını kontrol edin
    const checkResult = await pool.query('SELECT * FROM personnel_family WHERE personnel_id = $1', [personnelId]);

    if (checkResult.rows.length === 0) {
      // Kayıt yoksa yeni bir satır ekleyin
      const insertResult = await pool.query(
        'INSERT INTO personnel_family (personnel_id, marital_status, number_of_children) VALUES ($1, $2, $3) RETURNING *',
        [personnelId, marital_status, number_of_children]
      );
      res.status(201).json(insertResult.rows[0]); // Yeni kayıt eklendi
    } else {

        // Kayıt varsa güncelleme yapın
        const updateResult = await pool.query(
          'UPDATE personnel_family SET marital_status = $1, number_of_children = $2 WHERE personnel_id = $3 RETURNING *',
          [marital_status, number_of_children, personnelId]
        );
        res.status(200).json(updateResult.rows[0]); // Kayıt güncellendi
      }
    } catch (err) {
      console.error('Error updating/creating health details:', err);
      res.status(500).json({ error: 'Failed to update/create health details' });
    }
  });

module.exports = router;
