const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Content ekleme API'si
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Content type name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO content_types (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {  // UNIQUE constraint violation error code
      res.status(400).json({ error: 'This content type name is already in use.' });
    } else {
      console.error('Failed to add content type:', err);
      res.status(500).json({ error: 'Failed to add content type' });
    }
  }
});

// Comntent type için GET API
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_types');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching content types:', error);
    res.status(500).json({ error: 'Failed to fetch content types' });
  }
});

module.exports = router;