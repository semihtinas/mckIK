const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const xlsx = require('xlsx');
const { upload } = require('./file');
const fs = require('fs').promises;

// Tarih formatını "DD.MM.YYYY" şeklinden "YYYY-MM-DD" şekline çevirme fonksiyonu
const formatDate = (dateString) => {
  const [day, month, year] = dateString.split('.');
  return `${year}-${month}-${day}`;
};

// Hatalı giriş ekleme fonksiyonu
const insertInvalidEntry = async (row, errorMessage) => {
  try {
    await pool.query(
      'INSERT INTO invalid_attendance (card_number, entry_date, entry_time, exit_date, exit_time, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        row['Kart No'],
        formatDate(row['Giriş Tarihi']),
        row['Giriş Saati'],
        row['Çıkış Tarihi'] ? formatDate(row['Çıkış Tarihi']) : null,
        row['Çıkış Saati'],
        errorMessage
      ]
    );
    console.log('Invalid entry inserted:', { cardNumber: row['Kart No'], error: errorMessage });
  } catch (error) {
    console.error('Error inserting invalid entry:', error);
    throw error;
  }
};

// Hatalı giriş sayısını getiren fonksiyon
const getInvalidEntriesCount = async () => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM invalid_attendance');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting invalid entries count:', error);
    return 0;
  }
};

// Hatalı girişleri işleyen fonksiyon
const processInvalidEntry = async (cardNumber, personnelId) => {
  try {
    const invalidEntries = await pool.query(
      'SELECT * FROM invalid_attendance WHERE card_number = $1',
      [cardNumber]
    );

    for (const entry of invalidEntries.rows) {
      await pool.query(
        'INSERT INTO personnel_attendance (personnel_id, card_number, entry_date, entry_time, exit_date, exit_time, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [personnelId, entry.card_number, entry.entry_date, entry.entry_time, entry.exit_date, entry.exit_time]
      );

      await pool.query(
        'DELETE FROM invalid_attendance WHERE id = $1',
        [entry.id]
      );
    }
    console.log(`Processed invalid entries for card ${cardNumber}`);
  } catch (error) {
    console.error('Error processing invalid entry:', error);
    throw error;
  }
};

// Attendance geçmişini getirme endpoint'i
router.get('/personnel/:id/attendance', async (req, res) => {
  const personnelId = req.params.id;
  console.log('Fetching attendance for personnel:', personnelId);

  try {
    const result = await pool.query(
      'SELECT * FROM personnel_attendance WHERE personnel_id = $1 ORDER BY entry_date DESC, entry_time DESC',
      [personnelId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).send('Error fetching attendance history');
  }
});

// Attendance dosyası yükleme endpoint'i
router.post('/upload-attendance', upload.single('file'), async (req, res) => {
  console.log('=== Upload Request Started ===');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  if (!req.file) {
    console.log('No file in request');
    return res.status(400).json({ message: 'Dosya yüklenemedi. Lütfen bir dosya seçin.' });
  }

  console.log('File details:', req.file);
  const filePath = req.file.path;
  const invalidEntries = [];
  const skippedEntries = [];
  const expectedHeaders = ['Kart No', 'Adı', 'Soyadı', 'Giriş Tarihi', 'Giriş Saati', 'Çıkış Tarihi', 'Çıkış Saati'];

  try {
    // Excel dosyasını oku
    console.log('Reading Excel file:', filePath);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Başlıkları kontrol et
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Excel headers:', data[0]);
    
    const headers = data[0];
    const isValidTable = expectedHeaders.every((header) => headers.includes(header));
    
    if (!isValidTable) {
      console.log('Invalid headers detected');
      await fs.unlink(filePath);
      return res.status(400).json({ 
        message: 'Geçersiz tablo yapısı',
        expected: expectedHeaders,
        received: headers
      });
    }

    // Verileri al
    const rows = xlsx.utils.sheet_to_json(sheet);
    console.log(`Processing ${rows.length} rows`);

    // Her satırı işle
    for (const row of rows) {
      try {
        const cardNumber = row['Kart No'];
        if (!cardNumber) {
          await insertInvalidEntry(row, 'Kart numarası boş');
          continue;
        }

        const entryDate = formatDate(row['Giriş Tarihi']);
        const entryTime = row['Giriş Saati'] || null;
        const exitDate = row['Çıkış Tarihi'] ? formatDate(row['Çıkış Tarihi']) : null;
        const exitTime = row['Çıkış Saati'] || null;

        // Personel kontrolü
        const personnelResult = await pool.query(
          'SELECT personnel_id FROM personnel_card_mapping WHERE card_id = $1',
          [cardNumber]
        );

        if (personnelResult.rows.length === 0) {
          await insertInvalidEntry(row, 'Kart numarası eşleştirilemedi');
          continue;
        }

        const personnelId = personnelResult.rows[0].personnel_id;

        // Duplicate kontrolü
        const duplicateCheck = await pool.query(
          `SELECT * FROM personnel_attendance 
           WHERE personnel_id = $1 AND card_number = $2 
           AND entry_date = $3 AND entry_time = $4 
           AND (exit_date = $5 OR ($5 IS NULL AND exit_date IS NULL)) 
           AND (exit_time = $6 OR ($6 IS NULL AND exit_time IS NULL))`,
          [personnelId, cardNumber, entryDate, entryTime, exitDate, exitTime]
        );

        if (duplicateCheck.rows.length > 0) {
          skippedEntries.push({ ...row, reason: 'Bu kayıt zaten mevcut' });
          continue;
        }

        // Yeni kayıt ekle
        await pool.query(
          `INSERT INTO personnel_attendance 
           (personnel_id, card_number, entry_date, entry_time, exit_date, exit_time, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [personnelId, cardNumber, entryDate, entryTime, exitDate, exitTime]
        );

      } catch (rowError) {
        console.error('Error processing row:', rowError);
        await insertInvalidEntry(row, 'İşlem sırasında hata: ' + rowError.message);
      }
    }

    // İşlem sonuçlarını hazırla
    const invalidEntriesCount = await getInvalidEntriesCount();
    const response = {
      message: invalidEntriesCount > 0 || skippedEntries.length > 0 
        ? 'Dosya yüklendi, ancak bazı kayıtlar işlenemedi veya atlandı.'
        : 'Tüm kayıtlar başarıyla işlendi.',
      invalidEntriesCount,
      skippedEntries,
      processedCount: rows.length - invalidEntriesCount - skippedEntries.length
    };

    console.log('Processing completed:', response);

    // İşlem bittikten sonra geçici dosyayı sil
    await fs.unlink(filePath);

    res.status(200).json(response);

  } catch (error) {
    console.error('Fatal error during file processing:', error);
    // Hata durumunda dosyayı temizle
    if (filePath) {
      await fs.unlink(filePath).catch(err => console.error('Error deleting file after error:', err));
    }
    res.status(500).json({ 
      message: 'Dosya işlenirken bir hata oluştu.',
      error: error.message
    });
  }
});

// Hatalı kayıtları güncelleme endpoint'i
router.post('/update-attendance', async (req, res) => {
  const { personnelId, cardNumber, entryDate, entryTime, exitDate, exitTime } = req.body;
  console.log('Updating attendance:', { personnelId, cardNumber, entryDate, entryTime, exitDate, exitTime });

  if (!personnelId || !cardNumber) {
    return res.status(400).json({ message: 'Personel ID ve Kart Numarası zorunludur.' });
  }

  try {
    // Duplicate kontrolü
    const duplicateCheck = await pool.query(
      `SELECT * FROM personnel_attendance 
       WHERE personnel_id = $1 AND card_number = $2 
       AND entry_date = $3 AND entry_time = $4 
       AND (exit_date = $5 OR ($5 IS NULL AND exit_date IS NULL)) 
       AND (exit_time = $6 OR ($6 IS NULL AND exit_time IS NULL))`,
      [personnelId, cardNumber, entryDate, entryTime, exitDate, exitTime]
    );

    if (duplicateCheck.rows.length > 0) {
      console.log('Duplicate record found');
      return res.status(200).send('Bu kayıt zaten mevcut.');
    }

    // Kart eşleştirme kontrolü
    const result = await pool.query(
      'SELECT * FROM personnel_card_mapping WHERE card_id = $1',
      [cardNumber]
    );

    if (result.rows.length > 0) {
      if (result.rows[0].personnel_id === personnelId) {
        await processInvalidEntry(cardNumber, personnelId);
        console.log('Card already mapped correctly');
        return res.status(200).send('Personel kart numarası zaten doğru şekilde eşleştirildi.');
      }

      // Kart eşleştirmesini güncelle
      await pool.query(
        'UPDATE personnel_card_mapping SET personnel_id = $1 WHERE card_id = $2',
        [personnelId, cardNumber]
      );
      console.log('Updated card mapping');
    } else {
      // Yeni kart eşleştirmesi oluştur
      await pool.query(
        'INSERT INTO personnel_card_mapping (personnel_id, card_id) VALUES ($1, $2)',
        [personnelId, cardNumber]
      );
      console.log('Created new card mapping');
    }

    // Hatalı kayıtları işle
    await processInvalidEntry(cardNumber, personnelId);
    console.log('Successfully processed invalid entries');
    
    return res.status(200).send('Personel başarıyla eşleştirildi.');

  } catch (error) {
    console.error('Error updating attendance:', error);
    return res.status(500).json({ 
      message: 'Kayıt güncellenirken hata oluştu.',
      error: error.message 
    });
  }
});

// Hatalı kayıtları getirme endpoint'i
router.get('/invalid-entries', async (req, res) => {
  console.log('Fetching invalid entries');
  try {
    const result = await pool.query(
      'SELECT * FROM invalid_attendance ORDER BY entry_date DESC, entry_time DESC'
    );
    
    console.log(`Found ${result.rows.length} invalid entries`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching invalid entries:', error);
    res.status(500).json({ 
      message: 'Hatalı kayıtlar alınırken bir sorun oluştu.',
      error: error.message 
    });
  }
});

// Personele ait attendance kayıtlarını silme endpoint'i
router.delete('/personnel/:id/attendance/:attendanceId', async (req, res) => {
  const { id: personnelId, attendanceId } = req.params;
  console.log('Deleting attendance record:', { personnelId, attendanceId });

  try {
    const result = await pool.query(
      'DELETE FROM personnel_attendance WHERE id = $1 AND personnel_id = $2 RETURNING *',
      [attendanceId, personnelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kayıt bulunamadı veya silme yetkisi yok.' });
    }

    res.status(200).json({ message: 'Kayıt başarıyla silindi', deletedRecord: result.rows[0] });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ 
      message: 'Kayıt silinirken bir hata oluştu.',
      error: error.message 
    });
  }
});

// Toplu attendance silme endpoint'i
router.delete('/personnel/:id/attendance', async (req, res) => {
  const personnelId = req.params.id;
  const { startDate, endDate } = req.query;
  console.log('Bulk deleting attendance records:', { personnelId, startDate, endDate });

  try {
    let query = 'DELETE FROM personnel_attendance WHERE personnel_id = $1';
    const params = [personnelId];

    if (startDate && endDate) {
      query += ' AND entry_date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    query += ' RETURNING *';

    const result = await pool.query(query, params);
    
    res.status(200).json({
      message: `${result.rows.length} kayıt başarıyla silindi`,
      deletedRecords: result.rows
    });
  } catch (error) {
    console.error('Error bulk deleting attendance records:', error);
    res.status(500).json({ 
      message: 'Kayıtlar silinirken bir hata oluştu.',
      error: error.message 
    });
  }
});

module.exports = router;