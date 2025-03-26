const express = require('express');
const pool = require('../config/db');  // Veritabanı bağlantısı
const router = express.Router();

// GET: Personelin kariyer geçmişini getiren API
router.get('/personnel/:id/career', async (req, res) => {
  const personnelId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT eh.hire_date, eh.termination_date, 
             d.name AS department, 
             t.name AS title 
      FROM employment_history eh
      LEFT JOIN departments d ON eh.department_id = d.id
      LEFT JOIN titles t ON eh.title_id = t.id
      WHERE eh.personnel_id = $1
      ORDER BY eh.hire_date DESC
    `, [personnelId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No career history found for this personnel' });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching career history:', error);
    res.status(500).json({ error: 'Failed to fetch career history' });
  }
});

// POST: Personelin departman ve unvan değişikliğini kaydeden API
router.post('/personnel/:id/career', async (req, res) => {
  const personnelId = req.params.id;
  const { department_id, title_id } = req.body;

  if (!department_id || !title_id) {
    return res.status(400).json({ error: 'Department ID and Title ID are required' });
  }

  try {
    // Kariyer geçmişine yeni bir giriş ekliyoruz ve hire_date'i otomatik olarak NOW() ile alıyoruz
    const result = await pool.query(`
      INSERT INTO employment_history (personnel_id, department_id, title_id, hire_date) 
      VALUES ($1, $2, $3, NOW()) RETURNING *
    `, [personnelId, department_id, title_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding career record:', error);
    res.status(500).json({ error: 'Failed to add career record' });
  }
});

// POST: Departman ve unvan güncelleme ve geçmiş kaydetme


router.post('/personnel/:id/update-department-title', async (req, res) => {
    const { id } = req.params;
    const { department_id, title_id } = req.body;
  
    console.log(`Update request received for personnel ID: ${id} with department_id: ${department_id} and title_id: ${title_id}`);
  
    if (!department_id || !title_id) {
      return res.status(400).json({ message: 'Both department_id and title_id are required.' });
    }

  try {
    // Mevcut departman ve title bilgilerini kontrol ediyoruz
    const currentData = await pool.query(`
      SELECT pd.department_id, pt.title_id 
      FROM personnel_departments pd 
      LEFT JOIN personnel_titles pt ON pd.personnel_id = pt.personnel_id 
      WHERE pd.personnel_id = $1
    `, [id]);

    const currentDepartment = currentData.rows[0]?.department_id;
    const currentTitle = currentData.rows[0]?.title_id;

    // Eğer güncellenmek istenen değerler zaten aynıysa
    if (currentDepartment === department_id && currentTitle === title_id) {
      return res.status(400).json({ message: 'Department and title are already up-to-date.' });
    }

    // Departman güncellemesi
    const departmentUpdate = await pool.query(`
      INSERT INTO personnel_departments (personnel_id, department_id) 
      VALUES ($1, $2)
      ON CONFLICT (personnel_id) 
      DO UPDATE SET department_id = EXCLUDED.department_id
    `, [id, department_id]);

    // Title güncellemesi
    const titleUpdate = await pool.query(`
      INSERT INTO personnel_titles (personnel_id, title_id) 
      VALUES ($1, $2)
      ON CONFLICT (personnel_id) 
      DO UPDATE SET title_id = EXCLUDED.title_id
    `, [id, title_id]);

    // Güncellemelerin kontrolü
    if (departmentUpdate.rowCount === 0 || titleUpdate.rowCount === 0) {
      throw new Error('Failed to update department or title');
    }

    // Kariyer geçmişi tablosuna kaydetme
    await pool.query(`
      INSERT INTO employment_history (personnel_id, department_id, title_id, hire_date)
      VALUES ($1, $2, $3, NOW())
    `, [id, department_id, title_id]);

    return res.status(200).json({ message: 'Department and title updated successfully, and history recorded.' });

  } catch (error) {
    console.error('Error updating department and title:', error);
    return res.status(500).json({ error: 'Failed to update department and title.' });
  }
});

module.exports = router;
