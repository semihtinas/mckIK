const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const LeaveAllocationScheduler = require('./schedulers/leaveAllocationScheduler');
const ocrService = require('./services/ocrService');

(async () => {
  try {
    // worker'ı başlatmak için ilk kez extractTextFromImage çağrısı yap
    const testResult = await ocrService.extractTextFromImage(path.join(__dirname, 'test.jpg')).catch(() => {
      console.log('OCR servisi başlatıldı');
    });
    console.log('OCR servisi hazır');
  } catch (error) {
    console.log('OCR servisi başlatıldı (hata yakalandı)');
  }
})();

// Express uygulamasını oluştur
const app = express();

// Middleware'ler
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Static dosya servis ayarları
app.use('/uploads/photos', express.static(path.join(__dirname, 'uploads/photos')));
app.use('/uploads/documents', express.static(path.join(__dirname, 'uploads/documents')));
app.use('/uploads/attendance', express.static(path.join(__dirname, 'uploads/attendance')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/expenses', express.static(path.join(__dirname, 'uploads/expenses')));
app.use('/uploads/kanban', express.static(path.join(__dirname, 'uploads/kanban')));


// Rota dosyalarını içe aktar
const { router: fileRoutes } = require('./routes/file');
const attendanceRoutes = require('./routes/attendance');
const personnelRoutes = require('./routes/personnel');
const titleRoutes = require('./routes/titles');
const departmentRoutes = require('./routes/departments');
const contentTypesRoutes = require('./routes/contents');
const healthRoutes = require('./routes/health');
const educationRoutes = require('./routes/education');
const addressRoutes = require('./routes/address');
const contactRoutes = require('./routes/contact');
const familyRoutes = require('./routes/family');
const leaveTypeRoutes = require('./routes/leaveType');
const publicHolidayRoutes = require('./routes/publicHoliday');
const leavePolicyRoutes = require('./routes/leavePolicy');
const careerRoutes = require('./routes/career');
const leaveRoutes = require('./routes/leave');
const loginRoute = require('./routes/login'); // login.js dosyasını dahil edin
const usersRoutes = require('./routes/users'); // users.js dosyasını ekleyin
const permissionsRoutes = require('./routes/permissions'); // Rotaları import edin
const rolesRoutes = require('./routes/roles'); // routes/roles.js'i içe aktarın
const userRoutes = require('./routes/user');
const annualLeaveBalanceRouter = require('./routes/annualLeaveBalance');
// Mevcut importların altına eklenecek yeni importlar
const leaveManagementRoutes = require('./routes/leaveManagement');
const calendarRoutes = require('./routes/calendar');
const workflowRoutes = require('./routes/workflow');
const meetingDocumentsRoutes = require('./routes/meetingDocuments');
const meetingsRoutes = require('./routes/meetings');
const meetingMinutesRoutes = require('./routes/meetingMinutes');
const meetingParticipantsRoutes = require('./routes/meetingParticipants');
const meetingResponseRoutes = require('./routes/meetingResponse');
const actionItemsRoutes = require('./routes/meetingActionItems');
const shiftRoutes = require('./routes/shifts');
// app.js içinde diğer route importlarının yanına ekleyin
const shiftTemplatesRoutes = require('./routes/shiftTemplates');
const shiftAssignmentsRoutes = require('./routes/shiftAssignments');
const advanceRequestsRoutes = require('./routes/advanceRequests');
const expenseRoutes = require('./routes/expenses');
const expensesCategoriesContents = require('./routes/expensesCategoriesContents');
const expenseTemplatesRouter = require('./routes/expenseTemplates');
const kanbanRoutes = require('./routes/kanban');
const designRouter = require('./routes/design'); // dosya ismine göre değişir
const overtimeRoutes = require('./routes/overtime');
const shiftLeaveRequestsRoutes = require('./routes/shiftLeaveRequests');





const publicRoutes = require('./routes/publicMeetingRoutes');
const authenticateToken = require('./middleware/authMiddleware');
// app.js
const settingsRoutes = require('./routes/settings');



// Public routes önce tanımlanmalı
app.use('/api/public', publicRoutes); // public rotalar için özel prefix
console.log('Login route initialized'); 
app.use('/api/login', loginRoute);    // login rotası da public



// API rotalarını tanımla
app.use('/api', fileRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/titles', titleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/contents', contentTypesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/family', familyRoutes);
app.use('/api', leaveTypeRoutes);
app.use('/api', publicHolidayRoutes);
app.use('/api', leavePolicyRoutes);
app.use('/api', careerRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/users', usersRoutes); // /api/users route'unu kullan
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles', rolesRoutes); // routes/roles.js doğru tanımlandı mı?
app.use(userRoutes);
app.use('/api', annualLeaveBalanceRouter);
// Mevcut API rotaları tanımlamalarının altına eklenecek yeni rotalar
app.use('/api/leave-management', leaveManagementRoutes);
// app.js'de route tanımlaması
app.use('/api', calendarRoutes);  // '/' yerine '/api' kullanın
app.use('/api', workflowRoutes);
app.use('/api', meetingDocumentsRoutes);
app.use('/api', meetingsRoutes);
app.use('/api', meetingMinutesRoutes);
app.use('/api', meetingParticipantsRoutes);
app.use('/api', meetingResponseRoutes);
// Sadece toplantı yanıtı için public endpoint
app.use('/api', actionItemsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shifts', shiftRoutes);
// route tanımlamalarının olduğu yere ekleyin
app.use('/api/shifts', shiftTemplatesRoutes);
app.use('/api/shifts', shiftAssignmentsRoutes);
app.use('/api', advanceRequestsRoutes);
app.use('/api/expenses', expenseRoutes); // /api/expenses prefix'i ile route'ları tanımla
app.use('/api/expenses-management', expensesCategoriesContents);
app.use('/api/expenses-management', expenseTemplatesRouter);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/design', designRouter)
app.use('/api', overtimeRoutes);
app.use('/api/shifts', shiftLeaveRequestsRoutes);

// Uploads klasörlerini oluştur
const fs = require('fs');
const uploadDirs = [
  'uploads/photos', 
  'uploads/documents', 
  'uploads/attendance',
  'uploads/task-attachments',  // task attachments için yeni klasör
  'uploads/expenses/requests',  // Harcama talepleri için belgeler
  'uploads/expenses/payments',   // Ödeme belgeleri için
  'uploads/kanban'

];



uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});


const expenseUploadsPath = path.join(__dirname, 'uploads/expenses');
if (!fs.existsSync(expenseUploadsPath)) {
  fs.mkdirSync(expenseUploadsPath, { recursive: true });
}

// Zamanlanmış görevleri başlat
LeaveAllocationScheduler.scheduleAllLeaveChecks();


// Global hata yakalama middleware'i
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);

  // Multer hataları için özel mesajlar
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          message: 'Dosya boyutu çok büyük',
          details: 'Maximum dosya boyutu 10MB olmalıdır'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          message: 'Beklenmeyen dosya alanı',
          details: 'Lütfen doğru dosya alanını kullandığınızdan emin olun'
        });
      default:
        return res.status(400).json({ 
          message: 'Dosya yükleme hatası',
          details: err.message
        });
    }
  }

  // Veritabanı hataları için özel mesajlar
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      message: 'Veritabanı işlem hatası',
      details: err.message
    });
  }

  // Genel hata yanıtı
  res.status(500).json({
    message: 'Sunucu hatası',
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : 'Bir hata oluştu'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Sayfa bulunamadı',
    path: req.path
  });
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Environment variables
const port = process.env.PORT || 5001;
const env = process.env.NODE_ENV || 'development';

// Server'ı başlat
app.listen(port, () => {
  console.log(`Server running on port ${port} in ${env} mode`);
  console.log(`File upload size limit: ${(10 * 1024 * 1024) / (1024 * 1024)}MB`);
  console.log(`Static files serving from: ${path.join(__dirname, 'uploads')}`);
  console.log('Available API routes:');
  console.log('- /api/personnel');
  console.log('- /api/titles');
  console.log('- /api/departments');
  console.log('- /api/upload-attendance');
  console.log('- /api/invalid-entries');
  console.log('- And more...');
  // Mevcut console.log listesine eklenecek yeni rotalar
console.log('- /api/leave-management/new-leave-types');
console.log('- /api/leave-management/new-leave-calculation-methods');
console.log('- /api/leave-management/new-leave-renewal-periods');
console.log('- /api/leave-management/new-leave-type-conditions');
console.log('- /api/leave-management/leave-policies');
console.log('- /api/leave-management/new-comparison-operators');
console.log('- /api/expenses (Harcama Yönetimi)');
console.log('  - GET    /api/expenses');
console.log('  - POST   /api/expenses');
console.log('  - PUT    /api/expenses/:id/status');
console.log('  - POST   /api/expenses/:id/pay');
console.log('  - GET    /api/expenses/:id/files');
});






app.get('/test', (req, res) => {
  res.send({ message: 'Test route çalışıyor' });
});



// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Performing graceful shutdown...');
  app.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;