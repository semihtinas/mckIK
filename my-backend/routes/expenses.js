// routes/expenses.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const ocrService = require('../services/ocrService');



// Dosya yükleme ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // URL'e göre kayıt klasörünü belirle
    const isPayment = req.path.includes('/pay');
    const uploadPath = path.join(__dirname, '../uploads/expenses', 
      isPayment ? 'payments' : 'requests'
    );
    
    // Klasörü oluştur (yoksa)
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

const fileFilter = (req, file, cb) => {
  // İzin verilen dosya tipleri
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Desteklenmeyen dosya formatı.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Tüm harcamaları getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = `
      SELECT e.*, 
             CONCAT(p.first_name, ' ', p.last_name) as personnel_name,
             CONCAT(ap.first_name, ' ', ap.last_name) as approver_name
      FROM expenses e
      LEFT JOIN personnel p ON e.personnel_id = p.id
      LEFT JOIN personnel ap ON e.approved_by = ap.id
      WHERE 1=1
    `;
    
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND e.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND e.expense_type = $${params.length}`;
    }
    
    query += ` ORDER BY e.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Harcama listesi hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// Yeni harcama oluştur
router.post('/', authenticateToken, upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      title,
      type,
      category_id,
      amount,
      description,
      payment_method,
      payment_date,
      sub_expenses
    } = req.body;

    // Ana harcama kaydını oluştur
    const expenseResult = await client.query(`
      INSERT INTO expenses (
        personnel_id, title, amount, expense_type,
        category_id, status, description, payment_method,
        payment_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      req.user.personnelId,
      title,
      amount,
      type,
      category_id,
      type === 'fixed' ? 'paid' : 'pending', // Sabit gider ise direkt ödenmiş, değilse onay bekleyen
      description,
      payment_method,
      payment_date ? new Date(payment_date) : new Date()
    ]);

    const expenseId = expenseResult.rows[0].id;

    // Alt harcamaları ekle
    if (sub_expenses) {
      const subExpensesArray = JSON.parse(sub_expenses);
      for (const subExpense of subExpensesArray) {
        await client.query(`
          INSERT INTO sub_expenses (
            expense_id, description, amount
          ) VALUES ($1, $2, $3)
        `, [expenseId, subExpense.description, subExpense.amount]);
      }
    }

    // Dosyaları kaydet
  // Dosyaları kaydet
if (req.files?.length > 0) {
  const contentTypeId = req.body.content_type_id || null;
  for (const file of req.files) {
    await client.query(`
      INSERT INTO expense_files (
        expense_id, filename, originalname,
        content_type_id, uploaded_at, document_type,
        uploaded_by
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'request_document', $5)
    `, [
      expenseId,
      file.filename,
      file.originalname,
      contentTypeId,
      req.user.personnelId
    ]);
  }
}

    await client.query('COMMIT');
    res.status(201).json(expenseResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Harcama oluşturma hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});


// Harcama durumunu güncelle
router.put('/:id/status', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const approverId = req.user.personnelId;

    await client.query('BEGIN');

    // Mevcut durumu al
    const currentStatusResult = await client.query(
      'SELECT status FROM expenses WHERE id = $1',
      [id]
    );

    if (currentStatusResult.rows.length === 0) {
      throw new Error('Harcama bulunamadı');
    }

    const oldStatus = currentStatusResult.rows[0].status;

    // Durumu güncelle
    const result = await client.query(`
      UPDATE expenses 
      SET status = $1,
          approved_by = $2,
          approved_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, approverId, id]);

    // Tarihçeye ekle
    await client.query(`
      INSERT INTO expense_history (
        expense_id, 
        old_status, 
        new_status, 
        changed_by, 
        description
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      oldStatus,
      status,
      approverId,
      reason || `Durum ${status} olarak değiştirildi`
    ]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Harcama güncelleme hatası:', error);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// Harcama dökümanlarını getir

router.get('/:id/files', authenticateToken, async (req, res) => {
  console.log('Döküman isteği alındı:', {
    expenseId: req.params.id,
    user: req.user
  });

  try {
    // Harcamanın varlığını kontrol et
    const expenseCheck = await pool.query(
      'SELECT personnel_id FROM expenses WHERE id = $1',
      [req.params.id]
    );

    if (expenseCheck.rows.length === 0) {
      console.log('Harcama bulunamadı');
      return res.status(404).json({ message: 'Harcama bulunamadı' });
    }

    // Dosyaları getir
    const result = await pool.query(`
      SELECT 
        id,
        filename,
        originalname,
        content_type_id,
        document_type,
        uploaded_at
      FROM expense_files
      WHERE expense_id = $1
      ORDER BY uploaded_at DESC
    `, [req.params.id]);

    console.log('Bulunan dosyalar:', {
      count: result.rows.length,
      files: result.rows
    });

    res.json(result.rows);
  } catch (error) {
    console.error('Dosya listesi hatası:', error);
    res.status(500).json({ 
      message: 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Harcama istatistikleri



router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH monthly_expenses AS (
        SELECT 
          EXTRACT(MONTH FROM created_at) as month,
          SUM(amount) as total
        FROM expenses
        WHERE created_at >= NOW() - INTERVAL '2 months'
        GROUP BY EXTRACT(MONTH FROM created_at)
      )
 SELECT 
  COALESCE(SUM(amount), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
  COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
  COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) as rejected_amount,
  COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
  (
    SELECT COALESCE(
      (SELECT SUM(amount) FROM expenses WHERE DATE_PART('month', created_at) = DATE_PART('month', NOW())) -
      (SELECT SUM(amount) FROM expenses WHERE DATE_PART('month', created_at) = DATE_PART('month', NOW() - INTERVAL '1 month')),
      0
    )
  ) as monthly_change
FROM expenses;
    `);

    res.json({
      ...result.rows[0],
      total_expenses: parseFloat(result.rows[0].total_expenses),
      pending_amount: parseFloat(result.rows[0].pending_amount),
      approved_amount: parseFloat(result.rows[0].approved_amount),
      monthly_change: parseFloat(result.rows[0].monthly_change)
    });
  } catch (error) {
    console.error('İstatistik hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});



// Ödeme işlemi

router.post('/:id/pay', authenticateToken, upload.array('files', 5), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { payment_method, description } = req.body;
    const payerId = req.user.personnelId;

    console.log('Ödeme isteği:', {
      expenseId: id,
      paymentMethod: payment_method,
      description,
      payerId,
      filesCount: req.files?.length || 0
    });

    // Mevcut durumu kontrol et
    const currentStatus = await client.query(
      'SELECT status FROM expenses WHERE id = $1',
      [id]
    );

    if (currentStatus.rows.length === 0) {
      throw new Error('Harcama bulunamadı');
    }

    if (currentStatus.rows[0].status !== 'approved') {
      throw new Error('Sadece onaylanmış harcamalar ödenebilir');
    }

    // Ödeme bilgilerini güncelle
    const result = await client.query(`
      UPDATE expenses 
      SET status = 'paid',
          payment_method = $1,
          payment_date = CURRENT_TIMESTAMP,
          paid_by = $2,
          payment_description = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [payment_method, payerId, description, id]);

    // Ödeme belgelerini kaydet
    if (req.files?.length > 0) {
      for (const file of req.files) {
        await client.query(`
          INSERT INTO expense_files (
            expense_id,
            filename,
            originalname,
            content_type_id,
            document_type,
            uploaded_at,
            uploaded_by
          ) VALUES ($1, $2, $3, $4, 'payment_document', CURRENT_TIMESTAMP, $5)
        `, [id, file.filename, file.originalname, 1, payerId]);

        console.log('Ödeme belgesi kaydedildi:', file.originalname);
      }
    }

    // İşlem geçmişini kaydet
    await client.query(`
      INSERT INTO expense_history (
        expense_id,
        old_status,
        new_status,
        changed_by,
        description
      ) VALUES ($1, $2, 'paid', $3, $4)
    `, [
      id,
      currentStatus.rows[0].status,
      payerId,
      `Ödeme yapıldı. Yöntem: ${payment_method}${description ? '. Not: ' + description : ''}`
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Ödeme başarıyla tamamlandı',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ödeme işlemi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Ödeme işlemi başarısız',
      error: error.message
    });
  } finally {
    client.release();
  }
});


// OCR ile belge analizi
// routes/expenses.js içinde, diğer route'ların üstünde olacak şekilde

// OCR ile belge analizi
// routes/expenses.js içinde

// routes/expenses.js

// OCR analiz endpoint'i
// routes/expenses.js içindeki analyze-document route'u

// routes/expenses.js içinde

router.post('/analyze-document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('OCR analiz isteği alındı:', {
      file: req.file,
      type: req.file?.mimetype
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Dosya yüklenmedi'
      });
    }

    const result = await ocrService.extractTextFromImage(req.file.path);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('OCR işlem hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;