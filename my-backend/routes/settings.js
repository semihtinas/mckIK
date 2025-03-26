// routes/settings.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// Tüm ayarları getir
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT setting_key, setting_value 
            FROM company_settings
            ORDER BY setting_key
        `);
        
        const settings = result.rows.reduce((acc, curr) => {
            acc[curr.setting_key] = curr.setting_value;
            return acc;
        }, {});

        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Belirli bir ayarı getir
router.get('/:key', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT setting_value FROM company_settings WHERE setting_key = $1',
            [req.params.key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({ value: result.rows[0].setting_value });
    } catch (err) {
        console.error('Error fetching setting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Ayar güncelle veya ekle
router.put('/:key', authenticateToken, async (req, res) => {
    const { value } = req.body;
    
    try {
        const result = await pool.query(`
            INSERT INTO company_settings (setting_key, setting_value)
            VALUES ($1, $2)
            ON CONFLICT (setting_key) 
            DO UPDATE SET 
                setting_value = EXCLUDED.setting_value,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [req.params.key, value]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating setting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Birden fazla ayarı toplu güncelle
router.put('/', authenticateToken, async (req, res) => {
    const settings = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const results = [];
        for (const [key, value] of Object.entries(settings)) {
            const result = await client.query(`
                INSERT INTO company_settings (setting_key, setting_value)
                VALUES ($1, $2)
                ON CONFLICT (setting_key) 
                DO UPDATE SET 
                    setting_value = EXCLUDED.setting_value,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [key, value]);
            
            results.push(result.rows[0]);
        }

        await client.query('COMMIT');
        res.json(results);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// Ayar sil
router.delete('/:key', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM company_settings WHERE setting_key = $1 RETURNING *',
            [req.params.key]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({ message: 'Setting deleted successfully' });
    } catch (err) {
        console.error('Error deleting setting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Şirket logosunu güncelle
router.put('/logo/upload', authenticateToken, async (req, res) => {
    const { logo } = req.body; // Base64 formatında logo

    try {
        await pool.query(`
            INSERT INTO company_settings (setting_key, setting_value)
            VALUES ('company_logo', $1)
            ON CONFLICT (setting_key) 
            DO UPDATE SET 
                setting_value = EXCLUDED.setting_value,
                updated_at = CURRENT_TIMESTAMP
        `, [logo]);

        res.json({ message: 'Logo updated successfully' });
    } catch (err) {
        console.error('Error updating logo:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;