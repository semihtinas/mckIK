const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Şirket rotaları
router.get('/companies', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, u.username as created_by_name 
      FROM design_company_name c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.is_active = true
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/companies', async (req, res) => {
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO design_company_name (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.userId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/companies/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE design_company_name SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/companies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE design_company_name SET is_active = false WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: error.message });
  }
});

// Üretim türü rotaları
router.get('/production-types', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pt.*, 
             
             u.username as created_by_name 
      FROM design_production_type pt
      
      LEFT JOIN users u ON pt.created_by = u.id
      WHERE pt.is_active = true
      ORDER BY pt.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching production types:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/production-types', async (req, res) => {
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO design_production_type (name, created_by) VALUES ($1, $2 ) RETURNING *',
      [name, req.user.userId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating production type:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/production-types/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE design_production_type SET name = $1  WHERE id = $2 RETURNING *',
      [name, id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating production type:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/production-types/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE design_production_type SET is_active = false WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting production type:', error);
    res.status(500).json({ error: error.message });
  }
});



//################################################################

// Ürün ailesi rotaları
router.get('/product-families', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pf.*, 
             pt.name as production_type_name,
             u.username as created_by_name 
      FROM design_product_family_name pf
      LEFT JOIN design_production_type pt ON pf.production_type_id = pt.id
      LEFT JOIN users u ON pf.created_by = u.id
      WHERE pf.is_active = true
      ORDER BY pf.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching product families:', error);
    res.status(500).json({ error: error.message });
  }
});




router.post('/product-families', async (req, res) => {
  const { name, production_type_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO design_product_family_name 
       (name, production_type_id, created_by) 
       VALUES ($1, $2, $3) RETURNING *`,
      [name, production_type_id, req.user.userId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating product family:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/product-families/:id', async (req, res) => {
  const { id } = req.params;
  const { name, production_type_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE design_product_family_name 
       SET name = $1, production_type_id = $2
       WHERE id = $3 RETURNING *`,
      [name, production_type_id, id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating product family:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/product-families/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE design_product_family_name SET is_active = false WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product family:', error);
    res.status(500).json({ error: error.message });
  }
});

// Konsept rotaları
router.get('/concepts', async (req, res) => {
  try {
    const { rows } = await pool.query(`
   SELECT 
    cn.id,
    cn.name,
    u.username AS created_by_name,
    cn.created_at,
    cn.is_active
FROM 
    design_concept_name cn
LEFT JOIN 
    users u ON cn.created_by = u.id
WHERE 
    cn.is_active = true
ORDER BY 
    cn.created_at DESC;

    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching concepts:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/concepts', async (req, res) => {
  const { name } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO design_concept_name 
       (name, created_by) 
       VALUES ($1, $2 ) RETURNING *`,
      [name, req.user.userId]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating concept:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/concepts/:id', async (req, res) => {
  const { id } = req.params;
  const { name  } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE design_concept_name 
       SET name = $1, 
       WHERE id = $2 RETURNING *`,
      [name, id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating concept:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/concepts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE design_concept_name SET is_active = false WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting concept:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;