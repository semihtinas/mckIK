// routes/advanceRequests.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../uploads/advances/payments');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  });
  
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
  });



// Avans talebi oluşturma
router.post('/advance-requests', authenticateToken, async (req, res) => {
    const { amount, reason } = req.body;
    const personnel_id = req.user.personnelId;

    try {
        const result = await pool.query(`
            INSERT INTO advance_requests 
            (personnel_id, amount, reason, status) 
            VALUES ($1, $2, $3, 'pending') 
            RETURNING *
        `, [personnel_id, amount, reason]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating advance request:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Bekleyen avans taleplerini getirme
router.get('/advance-requests/pending', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ar.*, 
                   p.first_name || ' ' || p.last_name as personnel_name
            FROM advance_requests ar
            JOIN personnel p ON ar.personnel_id = p.id
            WHERE ar.status = 'pending'
            ORDER BY ar.request_date DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending advance requests:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Personele ait avans taleplerini getirme
router.get('/advance-requests/personnel/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ar.*, 
                   p.first_name || ' ' || p.last_name as personnel_name
            FROM advance_requests ar
            JOIN personnel p ON ar.personnel_id = p.id
            WHERE ar.personnel_id = $1
            ORDER BY ar.request_date DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching personnel advance requests:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Avans talebini onaylama/reddetme
router.put('/advance-requests/:id/:action', authenticateToken, async (req, res) => {
    const { id, action } = req.params;
    const { approval_reason } = req.body;
    const approver_id = req.user.personnelId;

    try {
        const status = action === 'approve' ? 'approved' : 'rejected';

        const result = await pool.query(`
            UPDATE advance_requests 
            SET status = $1,
                approved_by = $2,
                approved_date = CURRENT_TIMESTAMP,
                approval_reason = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [status, approver_id, approval_reason, id]);

        // Add to history
        await pool.query(`
            INSERT INTO advance_history 
            (advance_request_id, old_status, new_status, changed_by, description)
            VALUES ($1, 'pending', $2, $3, $4)
        `, [id, status, approver_id, approval_reason]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating advance request:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// routes/advanceRequests.js içine eklenecek
router.get('/advance-requests/statistics', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_requests,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(AVG(amount), 0) as average_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount
            FROM advance_requests
        `);

        res.json({
            totalRequests: parseInt(result.rows[0].total_requests),
            pendingRequests: parseInt(result.rows[0].pending_requests),
            approvedRequests: parseInt(result.rows[0].approved_requests),
            rejectedRequests: parseInt(result.rows[0].rejected_requests),
            paidRequests: parseInt(result.rows[0].paid_requests),
            totalAmount: parseFloat(result.rows[0].total_amount),
            averageAmount: parseFloat(result.rows[0].average_amount),
            paidAmount: parseFloat(result.rows[0].paid_amount)
        });
    } catch (error) {
        console.error('Error fetching advance request statistics:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Tüm avans taleplerini getiren endpoint
router.get('/advance-requests/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                ar.*,
                CONCAT(p.first_name, ' ', p.last_name) as personnel_name,
                CONCAT(ap.first_name, ' ', ap.last_name) as approved_by_name
            FROM advance_requests ar
            JOIN personnel p ON ar.personnel_id = p.id
            LEFT JOIN personnel ap ON ar.approved_by = ap.id
            ORDER BY 
                CASE 
                    WHEN ar.status = 'pending' THEN 1
                    WHEN ar.status = 'approved' THEN 2
                    ELSE 3
                END,
                ar.request_date DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all advance requests:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Detaylı istatistikleri getiren endpoint
router.get('/advance-requests/detailed-statistics', authenticateToken, async (req, res) => {
    try {
        const monthlyStats = await pool.query(`
            SELECT 
                DATE_TRUNC('month', request_date) as month,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                SUM(amount) as total_amount
            FROM advance_requests
            WHERE request_date >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', request_date)
            ORDER BY month DESC
        `);

        const departmentStats = await pool.query(`
            SELECT 
                d.name as department_name,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN ar.status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN ar.status = 'rejected' THEN 1 END) as rejected_count,
                COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) as pending_count,
                SUM(ar.amount) as total_amount
            FROM advance_requests ar
            JOIN personnel p ON ar.personnel_id = p.id
            JOIN personnel_departments pd ON p.id = pd.personnel_id
            JOIN departments d ON pd.department_id = d.id
            GROUP BY d.name
            ORDER BY total_requests DESC
        `);

        res.json({
            monthlyStatistics: monthlyStats.rows,
            departmentStatistics: departmentStats.rows
        });
    } catch (error) {
        console.error('Error fetching detailed statistics:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Payment endpoint
router.post('/advance-requests/:id/pay', authenticateToken, upload.array('files', 5), async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      const { id } = req.params;
      const { payment_method, description } = req.body;
      const payerId = req.user.personnelId;
  
      // Check current status
      const currentStatus = await client.query(
        'SELECT status FROM advance_requests WHERE id = $1',
        [id]
      );
  
      if (currentStatus.rows[0].status !== 'approved') {
        throw new Error('Only approved advances can be paid');
      }
  
      // Update payment info
      const result = await client.query(`
        UPDATE advance_requests 
        SET status = 'paid',
            payment_method = $1,
            payment_date = CURRENT_TIMESTAMP,
            paid_by = $2,
            payment_description = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [payment_method, payerId, description, id]);
  
      // Save payment documents
      if (req.files?.length > 0) {
        for (const file of req.files) {
          await client.query(`
            INSERT INTO advance_files (
              advance_request_id,
              filename,
              originalname,
              document_type,
              uploaded_by
            ) VALUES ($1, $2, $3, 'payment_document', $4)
          `, [id, file.filename, file.originalname, payerId]);
        }
      }
  
      // Add to history
      await client.query(`
        INSERT INTO advance_history (
          advance_request_id,
          old_status,
          new_status,
          changed_by,
          description
        ) VALUES ($1, $2, 'paid', $3, $4)
      `, [
        id,
        currentStatus.rows[0].status,
        payerId,
        `Payment completed. Method: ${payment_method}${description ? '. Note: ' + description : ''}`
      ]);
  
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Payment error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  });


module.exports = router;