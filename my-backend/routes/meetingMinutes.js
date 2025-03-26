const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Dosya yükleme konfigürasyonu
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/meeting-minutes');
        // Klasör yoksa oluştur
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(err => cb(err));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // İzin verilen dosya tipleri
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Geçersiz dosya tipi'));
        }
    }
});

// Toplantı tutanaklarını getir
// Toplantı tutanaklarını getir
// Tutanakları getirme endpoint'i
// meetingMinutes.js içindeki GET endpoint'ini güncelleyin
router.get('/meetings/:meetingId/minutes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.*,
                a.agenda_item,
                CONCAT(c.first_name, ' ', c.last_name) as creator_name,
                COALESCE(json_agg(
                    CASE
                        WHEN mi.id IS NOT NULL THEN
                            json_build_object(
                                'id', mi.id,
                                'description', mi.description,
                                'assigned_to', mi.assigned_to,
                                'assigned_to_name', CONCAT(p.first_name, ' ', p.last_name),
                                'due_date', mi.due_date,
                                'priority', mi.priority,
                                'status', mi.status
                            )
                        ELSE NULL
                    END
                ) FILTER (WHERE mi.id IS NOT NULL), '[]') as action_items
            FROM meeting_minutes m
            LEFT JOIN meeting_agendas a ON m.agenda_item_id = a.id
            LEFT JOIN personnel c ON m.created_by = c.id
            LEFT JOIN meeting_minute_items mi ON m.id = mi.minute_id
            LEFT JOIN personnel p ON mi.assigned_to = p.id
            WHERE m.meeting_id = $1
            GROUP BY m.id, a.agenda_item, c.first_name, c.last_name
            ORDER BY m.created_at DESC
        `, [req.params.meetingId]);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching minutes:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yeni tutanak ekle
// Yeni tutanak ekle
// Tutanak ekleme endpoint
// routes/meetingMinutes.js dosyasında POST endpoint'ini güncelleyelim

router.post('/meetings/:meetingId/minutes', authenticateToken, async (req, res) => {
    const { agenda_item_id, content, actionItems } = req.body;

    try {
        await pool.query('BEGIN');

        // Önce tutanağı ekle
        const minuteResult = await pool.query(`
            INSERT INTO meeting_minutes (
                meeting_id, 
                agenda_item_id, 
                content, 
                created_by,
                status
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            req.params.meetingId,
            agenda_item_id,
            content,
            req.user.personnelId,
            'draft'
        ]);

        const minuteId = minuteResult.rows[0].id;

        // Eğer yapılacak işler varsa ekle
        if (Array.isArray(actionItems) && actionItems.length > 0) {
            const actionItemValues = actionItems.map((_, index) =>
                `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
            ).join(',');

            const actionItemParams = [minuteId];
            actionItems.forEach(item => {
                actionItemParams.push(
                    item.description,
                    item.assigned_to,
                    item.due_date,
                    item.priority
                );
            });

            await pool.query(`
                INSERT INTO meeting_minute_items 
                (minute_id, description, assigned_to, due_date, priority)
                VALUES ${actionItemValues}
            `, actionItemParams);
        }

        await pool.query('COMMIT');

        res.status(201).json({ 
            message: 'Tutanak başarıyla eklendi',
            minuteId: minuteId
        });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error creating minute:', err);
        res.status(500).json({ 
            error: 'Server error', 
            details: err.message 
        });
    }
});


// Tutanak güncelle
router.put('/meetings/:meetingId/minutes/:id',
    authenticateToken,
    upload.array('files'),
    async (req, res) => {
        try {
            await pool.query('BEGIN');

            const {
                agenda_item_id,
                content,
                decisions,
                action_items, // Yeni action items listesi
                responsible_personnel_id
            } = req.body;

            // Tutanağı güncelle
            const result = await pool.query(`
                UPDATE meeting_minutes
                SET 
                    agenda_item_id = $1,
                    content = $2,
                    decisions = $3,
                    updated_at = CURRENT_TIMESTAMP,
                    responsible_personnel_id = $4
                WHERE id = $5 AND meeting_id = $6
                RETURNING *
            `, [
                agenda_item_id,
                content,
                decisions,
                responsible_personnel_id,
                req.params.id,
                req.params.meetingId
            ]);

            if (result.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ error: 'Minute not found' });
            }

            // `meeting_minute_items` tablosuna yeni action items ekle
            if (Array.isArray(action_items) && action_items.length > 0) {
                const actionValues = action_items
                    .map((_, index) =>
                        `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5}, 'pending')`
                    ).join(',');

                const actionParams = [req.params.id];
                action_items.forEach(item => {
                    actionParams.push(
                        item.description,
                        item.assigned_to,
                        item.due_date,
                        item.priority
                    );
                });

                await pool.query(`
                    INSERT INTO meeting_minute_items 
                    (minute_id, description, assigned_to, due_date, priority, status)
                    VALUES ${actionValues}
                `, actionParams);
            }

            await pool.query('COMMIT');

            // Güncel tutanak bilgilerini getir
            const updatedResult = await pool.query(`
                SELECT 
                    mm.*,
                    json_agg(
                        json_build_object(
                            'id', mi.id,
                            'description', mi.description,
                            'assigned_to', mi.assigned_to,
                            'due_date', mi.due_date,
                            'priority', mi.priority,
                            'status', mi.status
                        )
                    ) FILTER (WHERE mi.id IS NOT NULL) as action_items
                FROM meeting_minutes mm
                LEFT JOIN meeting_minute_items mi ON mi.minute_id = mm.id
                WHERE mm.id = $1
                GROUP BY mm.id
            `, [req.params.id]);

            res.json(updatedResult.rows[0]);
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error('Error updating minute:', err);
            res.status(500).json({ error: 'Server error' });
        }
    }
);


// Tutanak sil
router.delete('/meetings/:meetingId/minutes/:id', authenticateToken, async (req, res) => {
    try {
        // Önce dosyaları sil
        const files = await pool.query(
            'SELECT file_path FROM meeting_minute_files WHERE minute_id = $1',
            [req.params.id]
        );

        await pool.query('BEGIN');

        // Veritabanından sil
        const result = await pool.query(
            'DELETE FROM meeting_minutes WHERE id = $1 AND meeting_id = $2 RETURNING id',
            [req.params.id, req.params.meetingId]
        );

        if (result.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Minute not found' });
        }

        // Fiziksel dosyaları sil
        for (const file of files.rows) {
            try {
                await fs.unlink(file.file_path);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }

        await pool.query('COMMIT');

        res.json({ message: 'Minute deleted successfully' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error deleting minute:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Yapılacak iş ekle
router.post('/meetings/:meetingId/minutes/:minuteId/action-items', authenticateToken, async (req, res) => {
    const { action_items } = req.body;

    try {
        if (!Array.isArray(action_items) || action_items.length === 0) {
            return res.status(400).json({ error: 'No action items provided.' });
        }

        const actionItemValues = action_items.map((_, index) =>
            `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
        ).join(',');

        const actionItemParams = action_items.flatMap(item => [
            item.description,
            item.assigned_to,
            item.due_date,
            item.priority
        ]);

        console.log('Action Item Values:', actionItemValues);
        console.log('Action Item Params:', [req.params.minuteId, ...actionItemParams]);

        const minuteResult = await pool.query(`
            INSERT INTO meeting_minutes (meeting_id, agenda_item_id, content, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [req.params.meetingId, agenda_item_id, content, req.user.userId]);
        
        const minuteId = minuteResult.rows[0]?.id; // `minuteId` burada tanımlanıyor
        

        res.status(201).json({ message: 'Action items başarıyla eklendi.' });
    } catch (err) {
        console.error('Error adding action items:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yapılacak işin durumunu güncelle
router.put('/meetings/:meetingId/minutes/:minuteId/action-items/:actionItemId/status', authenticateToken, async (req, res) => {
    const { status } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE action_items
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND meeting_minutes_id = $3
            RETURNING *
        `, [status, req.params.actionItemId, req.params.minuteId]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating action item status:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dosya sil
router.delete('/meetings/:meetingId/minutes/:minuteId/files/:fileId', authenticateToken, async (req, res) => {
    try {
        // Dosya bilgilerini al
        const fileResult = await pool.query(
            'SELECT * FROM meeting_minute_files WHERE id = $1 AND minute_id = $2',
            [req.params.fileId, req.params.minuteId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = fileResult.rows[0];

        // Fiziksel dosyayı sil
        await fs.unlink(file.file_path);

        // Veritabanından sil
        await pool.query(
            'DELETE FROM meeting_minute_files WHERE id = $1',
            [req.params.fileId]
        );

        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Tutanak onaylama
router.put('/meetings/:meetingId/minutes/:minuteId/approve', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            UPDATE meeting_minutes
            SET 
                status = 'approved',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND meeting_id = $3
            RETURNING *
        `, [req.user.personnelId, req.params.minuteId, req.params.meetingId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Minute not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error approving minute:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;