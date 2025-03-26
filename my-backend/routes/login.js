const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
    console.log('Login attempt for username:', req.body.username);
    const { username, password } = req.body;

    if (!username || !password) {
        console.log('Missing credentials');
        return res.status(400).json({ 
            message: 'Kullanıcı adı ve şifre gereklidir'
        });
    }

    try {
        const result = await pool.query(`
            SELECT u.*, p.id as personnel_id 
            FROM users u
            LEFT JOIN personnel p ON u.personnel_id = p.id
            WHERE u.username = $1
        `, [username]);



        console.log('Database query result rows:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('User not found:', username);
            return res.status(401).json({ 
                message: 'Kullanıcı bulunamadı'
            });
        }

        const user = result.rows[0];
        console.log('Retrieved password hash:', user.password);
        console.log('Comparing with provided password');
        
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ 
                message: 'Yanlış şifre'
            });
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                personnelId: user.personnel_id,
                username: user.username 
            },
            'gizliAnahtar',
            { expiresIn: '1h' }
        );

        console.log('Login successful for user:', username);
        res.status(200).json({ 
            message: 'Giriş başarılı', 
            token,
            user: {
                id: user.id,
                username: user.username,
                personnelId: user.personnel_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Sunucu hatası'
        });
    }
});

module.exports = router;