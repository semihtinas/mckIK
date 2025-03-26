const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/api/me', authMiddleware, async (req, res) => {
  try {
    console.log('Token user:', req.user); // Tüm token içeriğini görmek için

    // JWT'den gelen kullanıcı bilgisini kontrol et
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Kullanıcı kimliği bulunamadı' });
    }

    const user = await pool.query(
      `SELECT p.id, p.first_name, p.last_name, d.name AS department, 
              t.name AS title, ph.photo_url, r.name AS role
       FROM personnel p
       JOIN users u ON p.id = u.personnel_id
       LEFT JOIN roles r ON u.role_id = r.id  -- roles tablosunu kullanarak role bilgisi çekiliyor
       LEFT JOIN personnel_departments pd ON p.id = pd.personnel_id
       LEFT JOIN departments d ON pd.department_id = d.id
       LEFT JOIN personnel_titles pt ON p.id = pt.personnel_id
       LEFT JOIN titles t ON pt.title_id = t.id
       LEFT JOIN personnel_photos ph ON p.id = ph.personnel_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (!user.rows[0]) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
