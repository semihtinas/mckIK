// routes/publicMeetingRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyResponseToken } = require('../utils/tokenUtils');
const mailConfig = require('../config/mail');


// Public endpoint - Toplantı detaylarını getir
// Public endpoint - Toplantı detaylarını getir
router.get('/meetings/:meetingId', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.*,
                COALESCE(json_agg(
                    json_build_object(
                        'id', mp.personnel_id,
                        'name', CONCAT(p.first_name, ' ', p.last_name),
                        'role', mp.role,
                        'attendance_status', mp.attendance_status
                    )
                ) FILTER (WHERE mp.id IS NOT NULL), '[]') as participants
            FROM meetings m
            LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
            LEFT JOIN personnel p ON mp.personnel_id = p.id
            WHERE m.id = $1
            GROUP BY m.id
        `, [req.params.meetingId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching meeting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Public endpoint - Toplantı yanıtı
// Public endpoint - Toplantı yanıtı
router.put('/meetings/:meetingId/respond', async (req, res) => {
    console.log('Received response request:', req.body);
    const { response, token } = req.body;
    
    try {
        const decoded = verifyResponseToken(token);
        console.log('Decoded token:', decoded);


        // Katılım durumunu güncelle
 // Katılım durumunu güncelle
 const result = await pool.query(`
    UPDATE meeting_participants
    SET attendance_status = $1
    WHERE meeting_id = $2 AND personnel_id = $3
    RETURNING *
`, [response, req.params.meetingId, decoded.personnelId]);


if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Participant not found' });
}
        // Mail için bilgileri al
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
        `, [decoded.personnelId, req.params.meetingId]);

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
                    meetingId: req.params.meetingId
                })
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error processing response:', err);
        res.status(500).json({ error: 'Server error' });
    }
})

module.exports = router;