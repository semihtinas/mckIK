// middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// PDF ve diğer dokümanlar için ayrı depolama ayarları
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath;
        
        // Dosya tipine göre farklı klasörler kullan
        if (file.mimetype === 'application/pdf') {
            uploadPath = path.join(__dirname, '..', 'uploads', 'meeting-documents');
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            uploadPath = path.join(__dirname, '..', 'uploads', 'excel');
        } else {
            uploadPath = path.join(__dirname, '..', 'uploads');
        }

        // Klasör yoksa oluştur
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const meetingId = req.params.meetingId;
        const timestamp = Date.now();
        let prefix = '';

        // Dosya tipine göre prefix belirle
        if (req.originalUrl.includes('documents/minutes')) {
            prefix = 'minutes';
        } else if (req.originalUrl.includes('documents/agenda')) {
            prefix = 'agenda';
        }

        const uniqueName = prefix 
            ? `${prefix}-${meetingId}-${timestamp}-${file.originalname}`
            : `${timestamp}-${file.originalname}`;

        cb(null, uniqueName);
    }
});

// Genişletilmiş dosya filtresi
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/pdf', // pdf
        'application/msword', // doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya formatı. Sadece .xlsx, .pdf, .doc ve .docx dosyaları kabul edilmektedir.'), false);
    }
};

// Önce multer instance'larını oluştur
const uploadDocument = multer({
    storage: documentStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('document');

const uploadExcel = multer({
    storage: documentStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.originalname.endsWith('.xlsx')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece .xlsx dosyaları kabul edilmektedir.'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
}).single('file');

// Sonra export et
module.exports = {
    uploadDocument,
    uploadExcel
};