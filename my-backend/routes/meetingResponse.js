// routes/meetingResponse.js dosyasını güncelleyin
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyResponseToken } = require('../utils/tokenUtils');
const mailConfig = require('../config/mail');

// authenticateToken middleware'ini kaldırıyoruz
// routes/meetingResponse.js
router.put('/:meetingId/respond', async (req, res) => {
    const { response, token } = req.body;

    try {
        // Token'ı doğrula
        const decoded = verifyResponseToken(token);

        // Önce mevcut durumu kontrol et
        const currentStatus = await pool.query(`
            SELECT attendance_status 
            FROM meeting_participants 
            WHERE meeting_id = $1 AND personnel_id = $2
        `, [decoded.meetingId, decoded.personnelId]);

        // Eğer aynı durum tekrar gönderiliyorsa güncelleme yapma
        if (currentStatus.rows[0]?.attendance_status === response) {
            return res.json({ 
                success: true, 
                message: 'Status already up to date' 
            });
        }

        // Katılımcı güncelleme
        const updateResult = await pool.query(`
            UPDATE meeting_participants
            SET attendance_status = $1
            WHERE meeting_id = $2 AND personnel_id = $3
            RETURNING *
        `, [response, decoded.meetingId, decoded.personnelId]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Participant not found'
            });
        }

        // Mail gönder
        const meetingInfo = await pool.query(`
            SELECT 
                m.title, 
                m.start_time, 
                m.end_time,
                p.first_name,
                p.last_name,
                pc.email
            FROM meetings m
            JOIN personnel p ON p.id = $1
            LEFT JOIN personnel_contact pc ON p.id = pc.personnel_id
            WHERE m.id = $2
        `, [decoded.personnelId, decoded.meetingId]);

        if (meetingInfo.rows.length > 0) {
            const data = meetingInfo.rows[0];
            await mailConfig.sendMail({
                to: data.email,
                ...mailConfig.templates.statusUpdate({
                    name: `${data.first_name} ${data.last_name}`,
                    meetingTitle: data.title,
                    startTime: data.start_time,
                    endTime: data.end_time,
                    status: response,
                    meetingId: decoded.meetingId
                })
            });
        }

        res.json({ success: true });

    } catch (err) {
        console.error('Error in meeting response:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;