const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

const router = express.Router();

// Genel dosya yükleme ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // Dosya tipine göre farklı klasörler kullan
    if (file.fieldname === 'photo') {
      uploadPath = path.join(__dirname, '../uploads/photos');
    } else if (file.fieldname === 'file' && req.path.includes('attendance')) {
      uploadPath = path.join(__dirname, '../uploads/attendance');
    } else {
      uploadPath = path.join(__dirname, '../uploads/documents');
    }

    // Klasörü oluştur
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    console.log('Upload path:', uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log('Generated filename:', uniqueName);
    cb(null, uniqueName);
  }
});

// Dosya filtresi
const fileFilter = (req, file, cb) => {
  console.log('Processing file:', file.originalname, 'Field:', file.fieldname);

  if (file.fieldname === 'photo') {
    // Fotoğraf için izin verilen MIME tipleri
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir.'), false);
    }
  } else if (file.fieldname === 'file' && req.path.includes('attendance')) {
    // Attendance dosyaları için sadece Excel
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece .xlsx dosyaları kabul edilmektedir.'), false);
    }
  } else {
    // Diğer dosyalar için genel kabul
    cb(null, true);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Fotoğraf yükleme endpoint'i
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  console.log('Photo upload request received');
  
  if (!req.file) {
    return res.status(400).json({ error: 'Fotoğraf yüklenemedi' });
  }

  const personnelId = req.body.personnelId;
  const photoUrl = `/uploads/photos/${req.file.filename}`;

  try {
    const existingPhoto = await pool.query('SELECT * FROM personnel_photos WHERE personnel_id = $1', [personnelId]);

    if (existingPhoto.rows.length > 0) {
      await pool.query(
        'UPDATE personnel_photos SET photo_url = $1 WHERE personnel_id = $2',
        [photoUrl, personnelId]
      );
      console.log('Photo updated for personnel:', personnelId);
    } else {
      await pool.query(
        'INSERT INTO personnel_photos (personnel_id, photo_url) VALUES ($1, $2)',
        [personnelId, photoUrl]
      );
      console.log('New photo added for personnel:', personnelId);
    }

    res.status(201).json({ message: 'Fotoğraf başarıyla yüklendi', photoUrl });
  } catch (err) {
    console.error('Fotoğraf yükleme hatası:', err);
    res.status(500).json({ error: 'Fotoğraf yüklenemedi' });
  }
});

// Genel dosya yükleme endpoint'i
router.post('/personnel/:id/upload-files', upload.array('files'), async (req, res) => {
  console.log('Files upload request received');
  const personnelId = req.params.id;
  const { contentTypeId } = req.body;

  try {
    const uploadedFiles = req.files.map(file => ({
      personnel_id: personnelId,
      filename: file.filename,
      originalname: file.originalname,
      content_type_id: contentTypeId
    }));

    for (const file of uploadedFiles) {
      await pool.query(
        'INSERT INTO personnel_files (personnel_id, filename, originalname, content_type_id) VALUES ($1, $2, $3, $4)',
        [file.personnel_id, file.filename, file.originalname, file.content_type_id]
      );
    }

    console.log('Files uploaded successfully for personnel:', personnelId);
    res.status(201).json(uploadedFiles);
  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ error: 'Dosyalar yüklenemedi' });
  }
});

// Fotoğraf getirme endpoint'i
router.get('/personnel/:id/photo', async (req, res) => {
  const personnelId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT photo_url FROM personnel_photos WHERE personnel_id = $1',
      [personnelId]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'Fotoğraf bulunamadı' });
    }
  } catch (err) {
    console.error('Fotoğraf getirme hatası:', err);
    res.status(500).json({ error: 'Fotoğraf getirilemedi' });
  }
});

// Dosyaları getirme endpoint'i
router.get('/personnel/:id/files', async (req, res) => {
  const personnelId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT pf.*, ct.name as content_type_name 
       FROM personnel_files pf 
       LEFT JOIN content_types ct ON pf.content_type_id = ct.id 
       WHERE pf.personnel_id = $1`,
      [personnelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dosya bulunamadı' });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Dosya getirme hatası:', error);
    res.status(500).json({ error: 'Dosyalar getirilemedi' });
  }
});

// Router ve upload middleware'ini dışa aktar
module.exports = {
  router,
  upload
};