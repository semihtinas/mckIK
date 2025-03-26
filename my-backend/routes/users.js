// users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');



// Kullanıcıları listeleme
router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.username, u.personnel_id, p.first_name, p.last_name 
        FROM users u 
        LEFT JOIN personnel p ON u.personnel_id = p.id
      `);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Kullanıcılar alınırken hata:', error);
      res.status(500).json({ message: 'Kullanıcılar alınırken bir hata oluştu' });
    }
  });

// Yeni kullanıcı ekleme
router.post('/add', async (req, res) => {
  const { personnelId, username, password } = req.body;

  try {
    // Şifreyi hash'leyelim
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıyı veritabanına ekleyelim
    const result = await pool.query(
      'INSERT INTO users (username, password, personnel_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [username, hashedPassword, personnelId]
    );

    res.status(201).json({ message: 'Yeni kullanıcı başarıyla eklendi', user: result.rows[0] });
  } catch (error) {
    console.error('Kullanıcı eklenirken hata:', error);
    res.status(500).json({ message: 'Kullanıcı eklenirken bir hata oluştu' });
  }
});

// Şifre güncelleme
router.post('/update-password', async (req, res) => {
  const { userId, password } = req.body;

  try {
    // Şifreyi hash'leyelim
    const hashedPassword = await bcrypt.hash(password, 10);

    // Veritabanında şifreyi güncelleyelim
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING *',
      [hashedPassword, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.status(200).json({ message: 'Şifre başarıyla güncellendi' });
  } catch (error) {
    console.error('Şifre güncellenirken hata:', error);
    res.status(500).json({ message: 'Şifre güncellenirken bir hata oluştu' });
  }
});



// Kullanıcıları rolleriyle birlikte getir
router.get('/with-roles', authenticateToken, async (req, res) => {
  try {
      const result = await pool.query(`
          SELECT 
              u.id, 
              u.username, 
              u.personnel_id, 
              p.first_name, 
              p.last_name,
              u.role_id,
              r.name as role_name
          FROM users u 
          LEFT JOIN personnel p ON u.personnel_id = p.id
          LEFT JOIN roles r ON u.role_id = r.id
      `);
      res.json(result.rows);
  } catch (error) {
      console.error('Kullanıcılar alınırken hata:', error);
      res.status(500).json({ message: 'Kullanıcılar alınamadı' });
  }
});

// Kullanıcıya rol ata
router.post('/:userId/role', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { roleId } = req.body;

  try {
      const result = await pool.query(
          'UPDATE users SET role_id = $1 WHERE id = $2 RETURNING *',
          [roleId, userId]
      );

      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
      }

      res.json({ message: 'Rol başarıyla atandı', user: result.rows[0] });
  } catch (error) {
      console.error('Rol atanırken hata:', error);
      res.status(500).json({ message: 'Rol atanamadı' });
  }
});



module.exports = router;
