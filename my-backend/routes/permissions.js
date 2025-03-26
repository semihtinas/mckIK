// permissions.js route dosyası
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// Tüm izinleri getir
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description 
            FROM permissions 
            ORDER BY name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('İzinler alınırken hata:', error);
        res.status(500).json({ message: 'İzinler alınamadı' });
    }
});


// Kullanıcı izinlerini getiren endpoint
router.get('/user-permissions', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await pool.query(`
            SELECT DISTINCT p.name
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            JOIN users u ON u.role_id = r.id
            WHERE u.id = $1
        `, [userId]);
        
        const permissions = result.rows.map(row => row.name.toLowerCase());
        res.json({ permissions });
    } catch (error) {
        console.error('Kullanıcı izinleri alınırken hata:', error);
        res.status(500).json({ message: 'Kullanıcı izinleri alınamadı' });
    }
});

module.exports = router;