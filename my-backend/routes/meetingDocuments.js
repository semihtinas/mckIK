// routes/meetingDocuments.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const { uploadDocument } = require('../middleware/uploadMiddleware');
const path = require('path');
const fs = require('fs').promises;


// Tüm dokümanları getir
router.get('/meetings/documents', authenticateToken, async (req, res) => {
    const { search, startDate, endDate, documentType } = req.query;
    try {
        // Base SQL query
        let query = `
            SELECT 
                md.*,
                m.title as meeting_title,
                CONCAT(p.first_name, ' ', p.last_name) as created_by_name
            FROM meeting_documents md
            JOIN meetings m ON m.id = md.meeting_id
            JOIN personnel p ON p.id = md.uploaded_by
        `;

        // Array to hold query conditions and values for parameterized query
        const conditions = [];
        const values = [];

        // Search filter
        if (search) {
            conditions.push(`(LOWER(m.title) LIKE $${values.length + 1} OR LOWER(md.file_name) LIKE $${values.length + 1})`);
            values.push(`%${search.toLowerCase()}%`);
        }

        // Date range filter
        if (startDate) {
            conditions.push(`md.created_at >= $${values.length + 1}`);
            values.push(startDate);
        }
        if (endDate) {
            conditions.push(`md.created_at <= $${values.length + 1}`);
            values.push(endDate);
        }

        // Document type filter
        if (documentType && documentType !== 'all') {
            conditions.push(`md.document_type = $${values.length + 1}`);
            values.push(documentType);
        }

        // Combine conditions into the SQL query
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add ordering
        query += ' ORDER BY md.created_at DESC';

        console.log('Executing query:', query, values);

        // Execute the query with parameterized values
        const result = await pool.query(query, values);

        console.log('Fetched documents:', result.rows);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Server error' });
    }
});



// Dokümanı indir
router.get('/meetings/documents/:id/download', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM meeting_documents WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = result.rows[0];
        res.download(document.file_path, document.file_name);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Tutanak PDF'i kaydet
router.post('/meetings/:meetingId/documents/minutes', authenticateToken, async (req, res) => {
    try {
        console.log('Received request for saving minutes document');
        console.log('Request files:', req.files);

        if (!req.files || !req.files.document) {
            return res.status(400).json({
                error: 'No document provided',
                details: 'PDF file is required'
            });
        }

        const file = req.files.document;
        const meetingId = req.params.meetingId;

        // Uploads klasörü oluştur
        const uploadDir = path.join(__dirname, '../uploads/meeting-documents');
        await fs.mkdir(uploadDir, { recursive: true });

        // Dosya adı oluştur
        const fileName = `minutes-${meetingId}-${Date.now()}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        // Dosyayı kaydet
        await file.mv(filePath);

        // Veritabanına kaydet
        const result = await pool.query(`
            INSERT INTO meeting_documents (
                meeting_id,
                file_name,
                file_path,
                document_type,
                file_size,
                uploaded_by,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING id, file_path
        `, [
            meetingId,
            fileName,
            filePath,
            'minutes',
            file.size,
            req.user.personnelId
        ]);

        console.log('Minutes document saved successfully:', result.rows[0]);

        res.status(201).json({
            message: 'Tutanak başarıyla kaydedildi',
            documentId: result.rows[0].id,
            filePath: result.rows[0].file_path
        });

    } catch (error) {
        console.error('Error saving minutes document:', error);
        
        // Hata detaylarını logla
        if (error.response) {
            console.error('Response error:', error.response.data);
        }

        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

// Backend'de hata ayıklama için bir test endpoint'i ekleyelim
router.get('/test-upload', (req, res) => {
    res.json({
        message: 'Upload endpoint is working',
        fileUploadMiddleware: !!req.files,
        headers: req.headers
    });
});

// Gündem PDF'i kaydet
// Gündem PDF'i kaydet route'u
// Gündem PDF'i kaydet
router.post('/meetings/:meetingId/documents/agenda', authenticateToken, async (req, res) => {
    try {
        // Debug için
        console.log('Received request for saving agenda document');
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);

        // PDF verisi kontrolü
        if (!req.body || !req.files || !req.files.document) {
            return res.status(400).json({
                error: 'No document provided',
                details: 'PDF file is required'
            });
        }

        const file = req.files.document;
        const meetingId = req.params.meetingId;

        // Uploads klasörü oluştur
        const uploadDir = path.join(__dirname, '../uploads/meeting-documents');
        await fs.mkdir(uploadDir, { recursive: true });

        // Dosya adı oluştur
        const fileName = `agenda-${meetingId}-${Date.now()}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        // Dosyayı kaydet
        await file.mv(filePath);

        // Veritabanına kaydet
        const result = await pool.query(`
            INSERT INTO meeting_documents (
                meeting_id,
                file_name,
                file_path,
                document_type,
                file_size,
                uploaded_by,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            RETURNING id, file_path
        `, [
            meetingId,
            fileName,
            filePath,
            'agenda',
            file.size,
            req.user.personnelId
        ]);

        console.log('Document saved successfully:', result.rows[0]);

        res.status(201).json({
            message: 'Gündem belgesi başarıyla kaydedildi',
            documentId: result.rows[0].id,
            filePath: result.rows[0].file_path
        });

    } catch (error) {
        console.error('Error saving agenda document:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});


 // Gündem belgesini indir
router.get('/meetings/:meetingId/documents/:documentId', authenticateToken, async (req, res) => {


    try {
        console.log('Document ID:', req.params.documentId);
        console.log('Meeting ID:', req.params.meetingId);
        const result = await pool.query(

            'SELECT * FROM meeting_documents WHERE id = $1 AND meeting_id = $2',
            [req.params.documentId, req.params.meetingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = result.rows[0];
        res.download(document.file_path, document.file_name);

    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});




module.exports = router;