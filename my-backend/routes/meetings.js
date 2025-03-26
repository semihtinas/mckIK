const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const mailConfig = require('../config/mail'); // Bunu ekleyin


// Tüm toplantıları getir
// Toplantıları listele
router.get('/meetings', authenticateToken, async (req, res) => {
    try {
        const { status, startDate, endDate, search, type } = req.query;
        let query = `
            SELECT 
                m.*,
                CONCAT(p.first_name, ' ', p.last_name) as organizer_name,
                d.name as department_name,
                (
                    SELECT json_agg(json_build_object(
                        'id', mp.personnel_id,
                        'name', CONCAT(p2.first_name, ' ', p2.last_name),
                        'role', mp.role,
                        'attendance_status', mp.attendance_status
                    ))
                    FROM meeting_participants mp
                    JOIN personnel p2 ON p2.id = mp.personnel_id
                    WHERE mp.meeting_id = m.id
                ) as participants
            FROM meetings m
            LEFT JOIN personnel p ON p.id = m.organizer_id
            LEFT JOIN departments d ON d.id = m.department_id
            WHERE 1=1
        `;

        const queryParams = [];
        let paramCounter = 1;

        if (status && status !== 'all') {
            query += ` AND m.status = $${paramCounter}`;
            queryParams.push(status);
            paramCounter++;
        }

        if (startDate && endDate) {
            query += ` AND m.start_time >= $${paramCounter} AND m.end_time <= $${paramCounter + 1}`;
            queryParams.push(startDate, endDate);
            paramCounter += 2;
        }

        if (search) {
            query += ` AND (
                m.title ILIKE $${paramCounter} OR 
                CONCAT(p.first_name, ' ', p.last_name) ILIKE $${paramCounter}
            )`;
            queryParams.push(`%${search}%`);
            paramCounter++;
        }

        if (type && type !== 'all') {
            query += ` AND m.meeting_type = $${paramCounter}`;
            queryParams.push(type);
            paramCounter++;
        }

        query += ' ORDER BY m.start_time DESC';

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching meetings:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yeni toplantı oluştur
router.post('/meetings', authenticateToken, async (req, res) => {
    console.log('POST /api/meetings called with:', req.body);
    
    const {
        title,
        meeting_type,
        start_time,
        end_time,
        location,
        department_id,
        participants,
        description
    } = req.body;

    try {
        await pool.query('BEGIN');

        // Toplantıyı oluştur
        const meetingResult = await pool.query(`
            INSERT INTO meetings (
                title, meeting_type, start_time, end_time, 
                location, organizer_id, department_id, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'planned')
            RETURNING *
        `, [
            title, meeting_type, start_time, end_time,
            location, req.user.userId, department_id
        ]);

        const meeting = meetingResult.rows[0];

        // Katılımcıları ekle
        if (participants && participants.length > 0) {
            const participantValues = participants.map(participantId =>
                `(${meeting.id}, ${participantId}, 'participant', 'pending')`
            ).join(',');

            await pool.query(`
                INSERT INTO meeting_participants (
                    meeting_id, personnel_id, role, attendance_status
                )
                VALUES ${participantValues}
            `);

            // Katılımcılara mail gönder
            try {
                // Tüm katılımcıların bilgilerini tek sorguda al
                const personnelResult = await pool.query(`
                    SELECT 
                        p.id,
                        p.first_name, 
                        p.last_name,
                        pc.email
                    FROM personnel p
                    LEFT JOIN personnel_contact pc ON p.id = pc.personnel_id
                    WHERE p.id = ANY($1)
                `, [participants]);

                // Her katılımcıya mail gönder
                for (const person of personnelResult.rows) {
                    if (person.email) {
                        try {
                            await mailConfig.sendMail({
                                to: person.email,
                                ...mailConfig.templates.meetingInvitation({
                                    name: `${person.first_name} ${person.last_name}`,
                                    meetingTitle: meeting.title,
                                    startTime: meeting.start_time,
                                    endTime: meeting.end_time,
                                    location: meeting.location,
                                    meetingId: meeting.id,
                                    personnelId: person.id
                                })
                            });
                            console.log(`Invitation email sent to ${person.email}`);
                        } catch (emailError) {
                            console.error(`Error sending email to ${person.email}:`, emailError);
                        }
                    }
                }
            } catch (emailError) {
                console.error('Error in email process:', emailError);
            }
        }

        await pool.query('COMMIT');

        // Oluşturulan toplantının detaylarını getir
        const finalResult = await pool.query(`
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
        `, [meeting.id]);

        res.status(201).json(finalResult.rows[0]);

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error creating meeting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toplantı güncelle
router.put('/meetings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { 
        title, 
        meeting_type, 
        start_time, 
        end_time, 
        location, 
        department_id,
        participants,
        status,
        description 
    } = req.body;

    try {
        await pool.query('BEGIN');

        // Toplantıyı güncelle
        const updateResult = await pool.query(`
            UPDATE meetings 
            SET title = $1, 
                meeting_type = $2, 
                start_time = $3, 
                end_time = $4, 
                location = $5, 
                department_id = $6,
                status = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8 AND organizer_id = $9
            RETURNING *
        `, [
            title, meeting_type, start_time, end_time,
            location, department_id, status || 'planned',
            id, req.user.userId
        ]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found or unauthorized' });
        }

        // Mevcut katılımcıları sil
        await pool.query('DELETE FROM meeting_participants WHERE meeting_id = $1', [id]);

        // Yeni katılımcıları ekle
        if (participants && participants.length > 0) {
            const participantValues = participants.map(participantId => 
                `(${id}, ${participantId}, 'participant', 'pending')`
            ).join(',');

            await pool.query(`
                INSERT INTO meeting_participants (
                    meeting_id, personnel_id, role, attendance_status
                )
                VALUES ${participantValues}
            `);
        }

        await pool.query('COMMIT');

        // TODO: Send email notifications about meeting updates

        res.json(updateResult.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error updating meeting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toplantı sil
router.delete('/meetings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('BEGIN');

        // Önce bağlı kayıtları sil
        await pool.query('DELETE FROM meeting_participants WHERE meeting_id = $1', [id]);
        await pool.query('DELETE FROM meeting_agendas WHERE meeting_id = $1', [id]);
        await pool.query('DELETE FROM meeting_minutes WHERE meeting_id = $1', [id]);
        await pool.query('DELETE FROM meeting_documents WHERE meeting_id = $1', [id]);
        await pool.query('DELETE FROM meeting_action_items WHERE meeting_id = $1', [id]);

        // Toplantıyı sil
        const result = await pool.query(
            'DELETE FROM meetings WHERE id = $1 AND organizer_id = $2 RETURNING id',
            [id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found or unauthorized' });
        }

        await pool.query('COMMIT');

        // TODO: Send cancellation notifications

        res.json({ message: 'Meeting deleted successfully' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error deleting meeting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toplantı detaylarını getir
// Toplantı detaylarını getir
// routes/meetings.js - Toplantı detayları getirme
router.get('/meetings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                m.*,
                CONCAT(p.first_name, ' ', p.last_name) as organizer_name,
                d.name as department_name,
                (
                    SELECT json_agg(json_build_object(
                        'id', mp.personnel_id,
                        'name', CONCAT(p2.first_name, ' ', p2.last_name),
                        'role', mp.role,
                        'attendance_status', mp.attendance_status
                    ))
                    FROM meeting_participants mp
                    JOIN personnel p2 ON p2.id = mp.personnel_id
                    WHERE mp.meeting_id = m.id
                ) as participants,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', a.id,
                            'agenda_item', a.agenda_item,
                            'description', a.description,
                            'duration_minutes', a.duration_minutes,
                            'presenter_id', a.presenter_id,
                            'is_postponed', a.is_postponed,
                            'postponed_reason', a.postponed_reason,
                            'postponed_date', a.postponed_date,
                            'order_number', a.order_number
                        ) ORDER BY a.order_number
                    )
                    FROM meeting_agendas a
                    WHERE a.meeting_id = m.id
                ) as agenda_items
            FROM meetings m
            LEFT JOIN personnel p ON p.id = m.organizer_id
            LEFT JOIN departments d ON d.id = m.department_id
            WHERE m.id = $1
            GROUP BY m.id, p.id, d.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching meeting details:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Katılımcı yanıtını güncelle
router.put('/meetings/:id/respond', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { response } = req.body; // 'accepted' veya 'declined'

    try {
        const result = await pool.query(`
            UPDATE meeting_participants
            SET attendance_status = $1
            WHERE meeting_id = $2 AND personnel_id = $3
            RETURNING *
        `, [response, id, req.user.personnelId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting participant not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating participant response:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toplantı gündem maddelerini getir
// Gündem maddelerini getir
router.get('/meetings/:meetingId/agenda', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ma.*,
                CONCAT(p.first_name, ' ', p.last_name) as presenter_name
            FROM meeting_agendas ma
            LEFT JOIN personnel p ON p.id = ma.presenter_id
            WHERE ma.meeting_id = $1
            ORDER BY ma.order_number
        `, [req.params.meetingId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching agenda items:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yeni gündem maddesi ekle
// Gündem maddesi ekleme route'u
router.post('/meetings/:meetingId/agenda', authenticateToken, async (req, res) => {
    const { 
        agenda_item, 
        description, 
        duration_minutes, 
        presenter_id,
        order_number 
    } = req.body;

    try {
        const result = await pool.query(`
            INSERT INTO meeting_agendas (
                meeting_id,
                agenda_item,
                description,
                duration_minutes,
                presenter_id,
                order_number,
                is_postponed
            )
            VALUES ($1, $2, $3, $4, $5, $6, false)
            RETURNING *
        `, [
            req.params.meetingId,
            agenda_item,
            description,
            duration_minutes,
            presenter_id || null,
            order_number
        ]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating agenda item:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});
// Gündem maddesi güncelle
// Gündem maddesi güncelle
router.put('/meetings/:meetingId/agenda/:id', authenticateToken, async (req, res) => {
    const { 
        agenda_item, 
        description, 
        duration_minutes, 
        presenter_id
    } = req.body;

    try {
        const result = await pool.query(`
            UPDATE meeting_agendas
            SET 
                agenda_item = $1,
                description = $2,
                duration_minutes = $3,
                presenter_id = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5 AND meeting_id = $6
            RETURNING *
        `, [
            agenda_item,
            description,
            duration_minutes,
            presenter_id,
            req.params.id,
            req.params.meetingId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agenda item not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating agenda item:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Gündem maddesi erteleme
router.put('/meetings/:meetingId/agenda/:id/postpone', authenticateToken, async (req, res) => {
    const { is_postponed, postponed_reason, postponed_date } = req.body;

    try {
        const result = await pool.query(`
            UPDATE meeting_agendas
            SET 
                is_postponed = $1,
                postponed_reason = $2,
                postponed_date = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND meeting_id = $5
            RETURNING *
        `, [
            is_postponed,
            postponed_reason,
            postponed_date,
            req.params.id,
            req.params.meetingId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agenda item not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating agenda postponement:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Gündem maddesi sil
router.delete('/meetings/:meetingId/agenda/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM meeting_agendas WHERE id = $1 AND meeting_id = $2 RETURNING id',
            [req.params.id, req.params.meetingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agenda item not found' });
        }

        res.json({ message: 'Agenda item deleted successfully' });
    } catch (err) {
        console.error('Error deleting agenda item:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Gündem maddesi durumunu güncelle
router.put('/meetings/:meetingId/agenda/:id/status', authenticateToken, async (req, res) => {
    const { status } = req.body;

    try {
        const result = await pool.query(`
            UPDATE meeting_agendas
            SET 
                status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND meeting_id = $3
            RETURNING *
        `, [status, req.params.id, req.params.meetingId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agenda item not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating agenda status:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Gündem maddelerini yeniden sırala
// Gündem maddelerini yeniden sırala
router.put('/meetings/:meetingId/agenda/reorder', authenticateToken, async (req, res) => {
    const { items } = req.body;

    try {
        await pool.query('BEGIN');

        for (const item of items) {
            await pool.query(`
                UPDATE meeting_agendas
                SET 
                    order_number = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND meeting_id = $3
            `, [item.order_number, item.id, req.params.meetingId]);
        }

        await pool.query('COMMIT');
        res.json({ message: 'Agenda items reordered successfully' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error reordering agenda items:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toplantı durumunu güncelle
router.put('/meetings/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE meetings 
            SET 
                status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating meeting status:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// routes/meetings.js

// Public endpoint for meeting details
router.get('/meetings/:id/public', async (req, res) => {
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
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching meeting:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;