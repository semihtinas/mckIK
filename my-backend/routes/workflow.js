const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment'); // Moment.js'i ekledik





// Dosya yükleme konfigürasyonu
// Multer konfigürasyonu
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'task-attachments');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});


// Dosya filtreleme
const fileFilter = (req, file, cb) => {
    // İzin verilen dosya tipleri
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya formatı'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});




// Alt görev durumunu değiştirme ve task history'yi güncelleme fonksiyonu
// Alt görev durumunu değiştirme ve task history'yi güncelleme fonksiyonu
const updateProgress = async (currentSubtasks, taskId, userId) => {
    console.log('Update Progress Called:', { currentSubtasks, taskId, userId });

    if (currentSubtasks.length === 0) return;

    const completedTasks = currentSubtasks.filter(task => task.status === 'completed').length;
    const progressPercentage = (completedTasks / currentSubtasks.length) * 100;
    const newStatus = completedTasks === currentSubtasks.length ? 'completed' : 'in_progress';

    try {
        const oldState = await pool.query(
            `SELECT status FROM meeting_minute_items WHERE id = $1`,
            [taskId]
        );

        console.log('Old Task State:', oldState.rows[0]);

        await pool.query(
            `INSERT INTO task_history (
                task_id, old_status, new_status, changed_by, description, changed_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [
                taskId,
                oldState.rows[0]?.status,
                newStatus,
                userId,
                `Alt görevlerin ${progressPercentage.toFixed(0)}%'i tamamlandı`
            ]
        );

        const result = await pool.query(
            `UPDATE meeting_minute_items 
             SET status = $1 
             WHERE id = $2`,
            [newStatus, taskId]
        );

        console.log('Task Updated:', result.rowCount);
    } catch (error) {
        console.error('Error updating task history:', error);
        throw error;
    }
};

// İşleri getir
router.get('/workflow/tasks', authenticateToken, async (req, res) => {
    const { priority, status, startDate, endDate, search } = req.query; // Filtre parametrelerini al

    try {
        // Dinamik sorgu oluşturma
        const queryParts = [];
        const queryParams = [];

        if (priority && priority !== 'all') {
            queryParts.push(`mi.priority = $${queryParams.length + 1}`);
            queryParams.push(priority);
        }

        if (status && status !== 'all') {
            queryParts.push(`mi.status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }

        if (startDate && endDate) {
            queryParts.push(`mi.due_date BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`);
            queryParams.push(startDate, endDate);
        }

        if (search) {
            queryParts.push(`mi.description ILIKE $${queryParams.length + 1}`);
            queryParams.push(`%${search}%`);
        }

        // Tüm filtreleri birleştirin
        const filterQuery = queryParts.length > 0 ? `WHERE ${queryParts.join(' AND ')}` : '';

        const query = `
            SELECT 
                mi.id, mi.description, mi.assigned_to, 
                CONCAT(p.first_name, ' ', p.last_name) as assigned_to_name, 
                mi.due_date, mi.priority, mi.status
            FROM meeting_minute_items mi
            LEFT JOIN personnel p ON mi.assigned_to = p.id
            ${filterQuery}
        `;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// İş güncelle
// İş güncelleme endpoint'i güncelleniyor
// İş güncelleme endpoint'i
router.put('/workflow/tasks/:id', authenticateToken, async (req, res) => {
    const { description, priority, due_date, status } = req.body;
    try {
        // Önce mevcut görevi al
        const currentTask = await pool.query(
            `SELECT status, priority, due_date FROM meeting_minute_items WHERE id = $1`,
            [req.params.id]
        );
        const oldTask = currentTask.rows[0];

        // Görevi güncelle
        await pool.query(`
            UPDATE meeting_minute_items
            SET description = $1, priority = $2, due_date = $3, status = $4
            WHERE id = $5
        `, [description, priority, due_date, status, req.params.id]);

        // Durum değişikliği için history kaydı
        if (oldTask.status !== status) {
            await pool.query(`
                INSERT INTO task_history (task_id, old_status, new_status, changed_by, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.params.id, oldTask.status, status, req.user.personnelId, 'Görev durumu güncellendi']);
        }

        // Öncelik değişikliği için history kaydı
        if (oldTask.priority !== priority) {
            await pool.query(`
                INSERT INTO task_history (task_id, old_status, new_status, changed_by, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                req.params.id,
                oldTask.status,
                status,
                req.user.personnelId,
                `Görev önceliği ${oldTask.priority} önceliğinden ${priority} önceliğine değiştirildi`
            ]);
        }

        // Tarih değişikliği için history kaydı
        const oldDate = moment(oldTask.due_date).format('DD.MM.YYYY');
        const newDate = moment(due_date).format('DD.MM.YYYY');
        
        if (oldDate !== newDate) {
            await pool.query(`
                INSERT INTO task_history (task_id, old_status, new_status, changed_by, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                req.params.id,
                oldTask.status,
                status,
                req.user.personnelId,
                `Görev bitiş tarihi ${oldDate} tarihinden ${newDate} tarihine değiştirildi`
            ]);
        }

        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


// Görev yorumları getir
// Yorumları getir
router.get('/workflow/tasks/:taskId/comments', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                tc.*,
                CONCAT(p.first_name, ' ', p.last_name) as created_by_name
            FROM task_comments tc
            JOIN personnel p ON tc.created_by = p.id
            WHERE tc.task_id = $1
            ORDER BY tc.created_at DESC
        `, [req.params.taskId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yorum ekle
router.post('/workflow/tasks/:taskId/comments', authenticateToken, async (req, res) => {
    const { comment } = req.body;
    
    try {
        // Yorumu ekle
        const result = await pool.query(`
            INSERT INTO task_comments (
                task_id, 
                comment, 
                created_by
            ) VALUES ($1, $2, $3)
            RETURNING id
        `, [
            req.params.taskId,
            comment,
            req.user.personnelId
        ]);

        // Task history'e yorum ekleme kaydı ekle
        await pool.query(`
            INSERT INTO task_history (
                task_id,
                old_status,
                new_status,
                changed_by,
                description,
                changed_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
            req.params.taskId,
            'in_progress',
            'in_progress',
            req.user.personnelId,
            'Yeni yorum eklendi'
        ]);
        
        res.status(201).json({ message: 'Comment added successfully', id: result.rows[0].id });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yorum ekle
router.post('/workflow/tasks/:taskId/comments', authenticateToken, async (req, res) => {
    const { comment, progress_percentage } = req.body;
    
    try {
        await pool.query(`
            INSERT INTO task_comments (
                task_id, comment, created_by, progress_percentage
            ) VALUES ($1, $2, $3, $4)
        `, [req.params.taskId, comment, req.user.personnelId, progress_percentage]);
        
        res.json({ message: 'Comment added successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Task history getir
// Task history endpoint'ini güncelle
router.get('/workflow/tasks/:taskId/history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                th.*,
                CONCAT(p.first_name, ' ', p.last_name) as changed_by_name
            FROM task_history th
            JOIN personnel p ON th.changed_by = p.id
            WHERE th.task_id = $1
            ORDER BY th.changed_at DESC
        `, [req.params.taskId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Task istatistikleri getir
// routes/workflow.js'e ekleyin
// İstatistikleri getir
router.get('/workflow/statistics', authenticateToken, async (req, res) => {
    try {
        console.log('Fetching statistics...'); // Debug için

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority_tasks,
                COUNT(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 1 END) as overdue_tasks,
                COUNT(CASE WHEN status = 'completed' AND updated_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as completed_this_month,
                COALESCE(
                    AVG(
                        CASE 
                            WHEN status = 'completed' 
                            THEN EXTRACT(epoch FROM (updated_at - created_at))/86400.0 
                        END
                    )::numeric(10,1),
                    0
                ) as avg_completion_days,
                COALESCE(
                    (
                        SELECT AVG(progress_percentage)::numeric(10,1)
                        FROM task_comments tc
                        WHERE tc.id IN (
                            SELECT MAX(id)
                            FROM task_comments
                            GROUP BY task_id
                        )
                    ),
                    0
                ) as avg_progress
            FROM meeting_minute_items
        `);

        console.log('Statistics result:', result.rows[0]); // Debug için
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in statistics endpoint:', err);
        res.status(500).json({ 
            error: 'Server error',
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// routes/workflow.js içinde

router.get('/workflow/statistics', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            WITH task_stats AS (
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
                    COUNT(CASE WHEN priority = 'High' THEN 1 END) as high_priority_tasks,
                    COUNT(CASE 
                        WHEN status = 'pending' 
                        AND due_date < CURRENT_DATE 
                        THEN 1 
                    END) as overdue_tasks,
                    COUNT(CASE 
                        WHEN status = 'completed' 
                        AND date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE)
                        THEN 1 
                    END) as completed_this_month,
                    AVG(CASE 
                        WHEN status = 'completed' 
                        THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400.0 
                    END)::numeric(10,1) as avg_completion_days
                FROM meeting_minute_items
            ),
            progress_stats AS (
                SELECT 
                    AVG(progress_percentage)::numeric(10,1) as avg_progress
                FROM (
                    SELECT 
                        task_id,
                        progress_percentage
                    FROM task_comments
                    WHERE progress_percentage IS NOT NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                ) latest_progress
            )
            SELECT * FROM task_stats, progress_stats
        `);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching statistics:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// routes/workflow.js'e ekleyin

router.post('/workflow/tasks/:taskId/comments', authenticateToken, async (req, res) => {
    const { comment } = req.body;
    
    try {
        // Yorumu ekle
        await pool.query(`
            INSERT INTO task_comments (
                task_id, 
                comment, 
                created_by
            ) VALUES ($1, $2, $3)
        `, [req.params.taskId, comment, req.user.personnelId]);

        // Task history'e yorum ekleme kaydı ekle
        await pool.query(`
            INSERT INTO task_history (
                task_id,
                old_status,
                new_status,
                changed_by,
                description,
                changed_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
            req.params.taskId,
            'in_progress',
            'in_progress',
            req.user.personnelId,
            'Yeni yorum eklendi'
        ]);
        
        res.status(201).json({ message: 'Comment added successfully' });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Geçmişi getir


//"""""""""""""""""""""""""""" Alt görev endpoint'leri"""""""""""""""""""""""""""

// Alt görev durumunu güncelleme endpoint'i
// Alt görev durumu değiştirme endpoint'i
// Alt görev durumu değiştirme endpoint'i
// Alt görev durumu değiştirme endpoint'i
// Alt görev durumu değiştirme endpoint'i
// Alt görev durumu değiştirme endpoint'i
router.put('/workflow/tasks/:taskId/subtasks/:subtaskId', authenticateToken, async (req, res) => {
    const { taskId, subtaskId } = req.params;
    const { status, description, assigned_to, due_date } = req.body;

    try {
        // Güncellenecek alanları belirle
        const fields = [];
        const values = [];
        let index = 1;

        if (status !== undefined) {
            fields.push(`status = $${index}`);
            values.push(status);
            index++;
        }

        if (assigned_to !== undefined) {
            fields.push(`assigned_to = $${index}`);
            values.push(assigned_to);
            index++;
        }

        if (due_date !== undefined) {
            fields.push(`due_date = $${index}`);
            values.push(due_date);
            index++;
        }

        // Eğer güncellenecek bir alan yoksa hata döndür
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Sorguyu oluştur
        const query = `
            UPDATE subtasks
            SET ${fields.join(', ')}
            WHERE id = $${index} AND parent_task_id = $${index + 1}
        `;
        values.push(subtaskId, taskId);

        // Subtask'ı güncelle
        await pool.query(query, values);

        // Tüm subtask'ları getir
        const result = await pool.query(
            `SELECT * FROM subtasks WHERE parent_task_id = $1`,
            [taskId]
        );

        // İlerlemeyi güncelle
        await updateProgress(result.rows, taskId, req.user.personnelId);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating subtask:', err);
        res.status(500).json({ error: 'Server error' });
    }
});




// Yeni alt görev ekleme endpoint'i
router.post('/workflow/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
    const { description, historyDescription } = req.body;

    try {
        // Yeni alt görev ekle
        const result = await pool.query(
            `INSERT INTO subtasks (
                parent_task_id, 
                description, 
                status, 
                created_by,
                created_at
            ) VALUES ($1, $2, 'pending', $3, CURRENT_TIMESTAMP)
            RETURNING *`,
            [req.params.taskId, description, req.user.personnelId]
        );

        // Alt görev history'sini güncelle
        await pool.query(
            `INSERT INTO task_history (
                task_id,
                old_status,
                new_status,
                changed_by,
                description,
                changed_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [
                req.params.taskId,
                'pending',
                'pending',
                req.user.personnelId,
                historyDescription || 'Yeni alt görev eklendi'
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating subtask:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Alt görevleri listeleme endpoint'i
router.get('/workflow/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                s.*,
                CONCAT(p.first_name, ' ', p.last_name) as assigned_to_name,
                CONCAT(c.first_name, ' ', c.last_name) as created_by_name
             FROM subtasks s
             LEFT JOIN personnel p ON s.assigned_to = p.id
             LEFT JOIN personnel c ON s.created_by = c.id
             WHERE s.parent_task_id = $1
             ORDER BY s.created_at DESC`,
            [req.params.taskId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching subtasks:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dosya yükleme endpoint'leri
// Dosya yükleme endpoint'i
// Dosya yükleme endpoint'i
router.post('/workflow/tasks/:taskId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya yüklenmedi' });
        }

        const result = await pool.query(
            `INSERT INTO task_attachments (
                task_id, 
                file_name, 
                file_path, 
                file_type, 
                file_size, 
                uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.params.taskId,
                req.file.originalname,
                `/task-attachments/${req.file.filename}`,
                req.file.mimetype,
                req.file.size,
                req.user.personnelId
            ]
        );

        // Kullanıcı bilgisiyle birlikte döndür
        const attachmentWithUser = await pool.query(
            `SELECT 
                ta.*,
                CONCAT(p.first_name, ' ', p.last_name) as uploaded_by_name
            FROM task_attachments ta
            LEFT JOIN personnel p ON p.id = ta.uploaded_by
            WHERE ta.id = $1`,
            [result.rows[0].id]
        );

        res.status(201).json(attachmentWithUser.rows[0]);
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Dosya indirme/görüntüleme endpoint'i
// Ekleri listeleme endpoint'i
// Ekleri listeleme endpoint'i
router.get('/workflow/tasks/:taskId/attachments', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                ta.id,
                ta.task_id,
                ta.file_name,
                ta.file_path,
                ta.file_type,
                ta.file_size,
                ta.uploaded_at,
                ta.uploaded_by,
                CONCAT(p.first_name, ' ', p.last_name) as uploaded_by_name
            FROM task_attachments ta
            LEFT JOIN personnel p ON p.id = ta.uploaded_by
            WHERE ta.task_id = $1
            ORDER BY ta.uploaded_at DESC`,
            [req.params.taskId]
        );

        res.json(result.rows || []);
    } catch (err) {
        console.error('Error fetching attachments:', err);
        res.status(500).json({ error: err.message });
    }
});

// Dosya indirme endpoint'i
// Dosya indirme/görüntüleme endpoint'i
// Dosya indirme/görüntüleme endpoint'i
router.get('/uploads/:folder/:file', authenticateToken, (req, res) => {
    const filePath = path.join(__dirname, '..', 'uploads', req.params.folder, req.params.file);
    res.sendFile(filePath);
});




// Checklist öğelerini getir
router.get('/workflow/checklist/:taskId/:subtaskId?', authenticateToken, async (req, res) => {
    try {
        const { taskId, subtaskId } = req.params;
        const queryParams = [taskId];
        let query = `
            SELECT * FROM task_checklist_items 
            WHERE task_id = $1
        `;

        if (subtaskId) {
            query += ` AND subtask_id = $2`;
            queryParams.push(subtaskId);
        } else {
            query += ` AND subtask_id IS NULL`;
        }

        query += ` ORDER BY created_at ASC`;
        
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching checklist items:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Yeni checklist öğesi ekle
router.post('/workflow/checklist/:taskId/:subtaskId?', authenticateToken, async (req, res) => {
    try {
        const { taskId, subtaskId } = req.params;
        const { description } = req.body;

        const result = await pool.query(`
            INSERT INTO task_checklist_items (
                task_id, 
                subtask_id, 
                description
            ) VALUES ($1, $2, $3)
            RETURNING *
        `, [taskId, subtaskId || null, description]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating checklist item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Checklist öğesi güncelle
router.put('/workflow/checklist/item/:itemId', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { is_completed } = req.body;

        const result = await pool.query(`
            UPDATE task_checklist_items 
            SET 
                is_completed = $1, 
                completed_at = $2
            WHERE id = $3
            RETURNING *
        `, [
            is_completed, 
            is_completed ? new Date() : null, 
            itemId
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating checklist item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Checklist öğesi sil
router.delete('/workflow/checklist/item/:itemId', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.params;
        await pool.query('DELETE FROM task_checklist_items WHERE id = $1', [itemId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting checklist item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
