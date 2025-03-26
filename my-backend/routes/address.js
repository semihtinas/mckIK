const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// GET: Adres bilgilerini getir
router.get('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  try {
    const result = await pool.query('SELECT * FROM personnel_address WHERE personnel_id = $1', [personnelId]);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching address details:', err);
    res.status(500).json({ error: 'Failed to fetch address details' });
  }
});

// PUT: Adres bilgilerini güncelle
router.put('/:personnelId', async (req, res) => {
  const personnelId = req.params.personnelId;
  const { home_address, city, district, postal_code } = req.body;

  try {
    // Önce ilgili personelin adres kaydı olup olmadığını kontrol et
    const checkResult = await pool.query('SELECT * FROM personnel_address WHERE personnel_id = $1', [personnelId]);

    let result;

    if (checkResult.rows.length > 0) {
      // Eğer kayıt varsa, güncelleme yap
      result = await pool.query(
        'UPDATE personnel_address SET home_address = $1, city = $2, district = $3, postal_code = $4 WHERE personnel_id = $5 RETURNING *',
        [home_address, city, district, postal_code, personnelId]
      );
    } else {
      // Eğer kayıt yoksa, yeni bir kayıt ekle
      result = await pool.query(
        'INSERT INTO personnel_address (personnel_id, home_address, city, district, postal_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [personnelId, home_address, city, district, postal_code]
      );
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating or inserting address details:', err);
    res.status(500).json({ error: 'Failed to update or insert address details' });
  }
});


module.exports = router;
