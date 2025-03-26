// roles.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// Tüm rolleri getir
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.id, r.name, r.description,
                   array_agg(json_build_object('id', p.id, 'name', p.name)) as permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            GROUP BY r.id, r.name, r.description
            ORDER BY r.name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Roller alınırken hata:', error);
        res.status(500).json({ message: 'Roller alınamadı' });
    }
});

// Yeni rol oluştur
router.post('/', authenticateToken, async (req, res) => {
    const { name, description } = req.body;
    
    try {
        const result = await pool.query(
            'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Rol oluşturulurken hata:', error);
        res.status(500).json({ message: 'Rol oluşturulamadı' });
    }
});

// Role izin ekle
router.post('/:roleId/permissions', authenticateToken, async (req, res) => {
    const { roleId } = req.params;
    const { permissionId } = req.body;

    try {
        await pool.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [roleId, permissionId]
        );
        res.json({ message: 'İzin başarıyla role eklendi' });
    } catch (error) {
        console.error('Role izin eklenirken hata:', error);
        res.status(500).json({ message: 'Role izin eklenemedi' });
    }
});

module.exports = router;