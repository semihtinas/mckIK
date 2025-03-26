const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET: İletişim bilgilerini getir
router.get('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  try {
    const result = await pool.query('SELECT * FROM personnel_contact WHERE personnel_id = $1', [personnelId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching contact details:', err);
    res.status(500).json({ error: 'Failed to fetch contact details' });
  }
});

// PUT: İletişim bilgilerini güncelle
router.put('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  const { phone_number, email, emergency_contact_name, emergency_contact_phone } = req.body;
  try {

    const checkResult = await pool.query('SELECT * FROM personnel_contact WHERE personnel_id = $1', [personnelId]);

    if (checkResult.rows.length === 0) {
      // Kayıt yoksa yeni bir satır ekleyin
      const insertResult = await pool.query(
        'INSERT INTO personnel_contact (personnel_id, phone_number, email, emergency_contact_name, emergency_contact_phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [personnelId, phone_number, email, emergency_contact_name, emergency_contact_phone]
      );
      res.status(201).json(insertResult.rows[0]); // Yeni kayıt eklendi

    } else {
      // Kayıt varsa güncelleme yapın
      const updateResult = await pool.query(
        'UPDATE personnel_contact SET phone_number = $1, email = $2, emergency_contact_name = $3, emergency_contact_phone = $4 WHERE personnel_id = $5 RETURNING *',
        [phone_number, email, emergency_contact_name, emergency_contact_phone, personnelId]
      );
      res.status(200).json(updateResult.rows[0]); // Kayıt güncellendi
    }
  } catch (err) {
    console.error('Error updating/creating health details:', err);
    res.status(500).json({ error: 'Failed to update/create health details' });
  }
});


module.exports = router;
