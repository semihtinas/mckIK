const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Title ekleme API'si
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Title name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO titles (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {  // UNIQUE constraint violation error code
      res.status(400).json({ error: 'This title name is already in use.' });
    } else {
      console.error('Failed to add title:', err);
      res.status(500).json({ error: 'Failed to add title' });
    }
  }
});

// Titles için GET API
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM titles');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching titles:', error);
    res.status(500).json({ error: 'Failed to fetch titles' });
  }
});

module.exports = router;