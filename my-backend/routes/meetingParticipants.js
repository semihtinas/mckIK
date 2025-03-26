const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const mailConfig = require('../config/mail');

// Toplantı katılımcılarını getir
// Toplantı katılımcılarını getir route'unda sorguyu güncelle
router.get('/meetings/:meetingId/participants', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching participants for meeting:', req.params.meetingId); // Debug için log ekleyelim

        const result = await pool.query(`
            SELECT 
                mp.id,
                mp.personnel_id,
                p.first_name,
                p.last_name,
                CONCAT(p.first_name, ' ', p.last_name) as name,
                mp.role,
                mp.attendance_status,
                pc.email
            FROM meeting_participants mp
            JOIN personnel p ON p.id = mp.personnel_id
            LEFT JOIN personnel_contact pc ON p.id = pc.personnel_id
            WHERE mp.meeting_id = $1
            ORDER BY p.first_name, p.last_name
        `, [req.params.meetingId]);

        console.log('Participants found:', result.rows.length); // Kaç katılımcı bulunduğunu görelim

        res.json(result.rows);
    } catch (err) {
        console.error('Detailed error:', err); // Detaylı hata bilgisi
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Katılımcılar yüklenirken bir hata oluştu',
            details: err.message,
            meetingId: req.params.meetingId
        });
    }
});

// Katılımcı ekle
// Katılımcı ekle route'unda
// Katılımcı ekle route'unu güncelleyelim
router.post('/meetings/:meetingId/participants', authenticateToken, async (req, res) => {
    const { participants } = req.body;

    try {
        await pool.query('BEGIN');

        // Toplantı bilgilerini al
        const meetingResult = await pool.query(
            'SELECT title, start_time, end_time, location FROM meetings WHERE id = $1',
            [req.params.meetingId]
        );

        if (meetingResult.rows.length === 0) {
            throw new Error('Meeting not found');
        }

        const meeting = meetingResult.rows[0];
        
        // Mevcut katılımcıları kontrol et
        const existingParticipants = await pool.query(
            'SELECT personnel_id FROM meeting_participants WHERE meeting_id = $1',
            [req.params.meetingId]
        );
        const existingIds = existingParticipants.rows.map(p => p.personnel_id);

        // Sadece yeni katılımcıları ekle
        const newParticipants = participants.filter(id => !existingIds.includes(id));

        if (newParticipants.length > 0) {
            // Yeni katılımcıları tek sorguda ekle
            const participantValues = newParticipants
                .map((id, index) => `($1, $${index + 2}, 'participant', 'pending', $${newParticipants.length + 2})`)
                .join(',');

            await pool.query(`
                INSERT INTO meeting_participants (meeting_id, personnel_id, role, attendance_status, created_by)
                VALUES ${participantValues}
            `, [req.params.meetingId, ...newParticipants, req.user.userId]);

            // Yeni eklenen katılımcılara mail gönder
            const personnelInfo = await pool.query(`
                SELECT p.id, p.first_name, p.last_name, pc.email
                FROM personnel p
                LEFT JOIN personnel_contact pc ON p.id = pc.personnel_id
                WHERE p.id = ANY($1)
            `, [newParticipants]);

            // Mail gönderme işlemlerini Promise.all ile yönet
            await Promise.all(personnelInfo.rows.map(person => {
                if (person.email) {
                    return mailConfig.sendMail({
                        to: person.email,
                        ...mailConfig.templates.meetingInvitation({
                            name: `${person.first_name} ${person.last_name}`,
                            meetingTitle: meeting.title,
                            startTime: meeting.start_time,
                            endTime: meeting.end_time,
                            location: meeting.location,
                            meetingId: req.params.meetingId,
                            personnelId: person.id
                        })
                    }).catch(error => {
                        console.error(`Failed to send email to ${person.email}:`, error);
                    });
                }
                return Promise.resolve();
            }));
        }

        await pool.query('COMMIT');

        // Güncellenmiş listeyi döndür
        const updatedParticipants = await pool.query(`
            SELECT 
                mp.id,
                mp.personnel_id,
                p.first_name,
                p.last_name,
                CONCAT(p.first_name, ' ', p.last_name) as name,
                mp.role,
                mp.attendance_status
            FROM meeting_participants mp
            JOIN personnel p ON p.id = mp.personnel_id
            WHERE mp.meeting_id = $1
            ORDER BY p.first_name, p.last_name
        `, [req.params.meetingId]);

        res.json(updatedParticipants.rows);

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error adding participants:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Katılımcı sil
router.delete('/meetings/:meetingId/participants/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('BEGIN');

        // Önce katılımcıyı kontrol et
        const checkResult = await pool.query(
            'SELECT id FROM meeting_participants WHERE id = $1 AND meeting_id = $2',
            [req.params.id, req.params.meetingId]
        );

        if (checkResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Participant not found' });
        }

        // Katılımcıyı sil
        await pool.query(
            'DELETE FROM meeting_participants WHERE id = $1 AND meeting_id = $2',
            [req.params.id, req.params.meetingId]
        );

        await pool.query('COMMIT');
        res.json({ message: 'Participant removed successfully' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error removing participant:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Katılım durumu güncelle
// Katılım durumu güncelleme route'unu güncelleyelim
router.put('/meetings/:meetingId/participants/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;

    try {
        await pool.query('BEGIN');

        // Mevcut durumu kontrol et
        const currentStatus = await pool.query(
            'SELECT attendance_status FROM meeting_participants WHERE id = $1 AND meeting_id = $2',
            [req.params.id, req.params.meetingId]
        );

        if (currentStatus.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Participant not found' });
        }

        // Eğer durum aynıysa güncelleme yapma
        if (currentStatus.rows[0].attendance_status === status) {
            await pool.query('ROLLBACK');
            return res.json({ 
                success: true, 
                message: 'Status already up to date',
                currentStatus: status
            });
        }

        // Statüyü güncelle
        const result = await pool.query(`
            UPDATE meeting_participants
            SET attendance_status = $1
            WHERE id = $2 AND meeting_id = $3
            RETURNING *
        `, [status, req.params.id, req.params.meetingId]);

        // Mail gönderme işlemini sadece durum değiştiğinde yap
        const participant = await pool.query(`
            SELECT 
                m.title, 
                m.start_time, 
                m.end_time,
                pc.email,
                p.first_name,
                p.last_name
            FROM meeting_participants mp
            JOIN meetings m ON m.id = mp.meeting_id
            JOIN personnel p ON p.id = mp.personnel_id
            LEFT JOIN personnel_contact pc ON p.id = pc.personnel_id
            WHERE mp.id = $1
        `, [req.params.id]);

        if (participant.rows.length > 0) {
            const data = participant.rows[0];
            if (data.email) {
                await mailConfig.sendMail({
                    to: data.email,
                    ...mailConfig.templates.statusUpdate({
                        name: `${data.first_name} ${data.last_name}`,
                        meetingTitle: data.title,
                        startTime: data.start_time,
                        endTime: data.end_time,
                        status: status,
                        meetingId: req.params.meetingId
                    })
                });
            }
        }

        await pool.query('COMMIT');
        res.json(result.rows[0]);

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error updating participant status:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Daveti yeniden gönder
router.post('/meetings/:meetingId/participants/:id/resend-invitation', authenticateToken, async (req, res) => {
    try {
        // Toplantı ve katılımcı bilgilerini al
        // Toplantı ve katılımcı bilgilerini al
const result = await pool.query(`
    SELECT 
        m.title, 
        m.start_time, 
        m.end_time,
        m.location,
        pc.email,
        p.first_name,
        p.last_name,
        p.id as personnel_id
    FROM meeting_participants mp
    JOIN meetings m ON m.id = mp.meeting_id
    JOIN personnel p ON p.id = mp.personnel_id
    LEFT JOIN personnel_contact pc ON p.id = pc.personnel_id
    WHERE mp.id = $1 AND mp.meeting_id = $2
`, [req.params.id, req.params.meetingId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        const data = result.rows[0];

        // Email gönder
// Email gönder
await mailConfig.sendMail({
    to: data.email,
    ...mailConfig.templates.meetingInvitation({
        name: `${data.first_name} ${data.last_name}`,
        meetingTitle: data.title,
        startTime: data.start_time,
        endTime: data.end_time,
        location: data.location,
        meetingId: req.params.meetingId,
        personnelId: data.personnel_id
    })
});
     

        res.json({ message: 'Invitation resent successfully' });
    } catch (err) {
        console.error('Error resending invitation:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;