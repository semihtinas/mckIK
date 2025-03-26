const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Departman ekleme API'si
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {  // PostgreSQL UNIQUE constraint violation error code
      // Bu durumda özel bir hata mesajı döndürüyoruz
      return res.status(400).json({ error: 'This department name is already in use.' });
    } else {
      console.error('Failed to add department:', err);
      return res.status(500).json({ error: 'Failed to add department' });
    }
  }
});


// Departmanlar için GET API
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});



// Departmana ait personelleri getir
router.get('/:id/personnel', async (req, res) => {
  const { id } = req.params;
  try {
      console.log('Gelen departman ID:', id);
      
      // Personnel sorgusu güncellendi
      const personnel = await pool.query(`
          SELECT 
              p.id,
              p.first_name,
              p.last_name,
              CONCAT(p.first_name, ' ', p.last_name) as full_name,
              p.gender,
              p.tc_id_number,
              p.birthdate,
              p.is_active,
              d.name as department_name
          FROM personnel p
          INNER JOIN personnel_departments pd ON p.id = pd.personnel_id
          INNER JOIN departments d ON pd.department_id = d.id
          WHERE pd.department_id = $1 AND p.is_active = true
          ORDER BY p.first_name, p.last_name
      `, [id]);

      console.log('Bulunan personel sayısı:', personnel.rows.length);
      res.status(200).json(personnel.rows);
  } catch (error) {
      console.error('Personel getirme hatası:', error);
      res.status(500).json({ 
          error: 'Departman personeli yüklenirken hata oluştu',
          details: error.message
      });
  }
});


module.exports = router;