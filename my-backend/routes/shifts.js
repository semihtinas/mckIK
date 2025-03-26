const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const mailConfig = require('../config/mail'); 
const PDFDocument = require('pdfkit');


const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);





// Otomatik izin atama fonksiyonu
async function assignLeavesToEmptyDays(departmentId, weekStart, weekEnd) {
  try {
    // Haftanın günlerini alıyoruz
    const startDate = dayjs(weekStart);
    const endDate = dayjs(weekEnd);
    const datesInRange = [];

    for (let date = startDate; date.isBefore(endDate) || date.isSame(endDate, 'day'); date = date.add(1, 'day')) {
      datesInRange.push(date.format('YYYY-MM-DD'));
    }

    // Departmandaki personelleri alıyoruz
    const personnelResult = await pool.query(
      `SELECT personnel_id FROM personnel_departments WHERE department_id = $1`,
      [departmentId]
    );
    const personnelIds = personnelResult.rows.map(row => row.personnel_id);

    // Mevcut vardiya ve izin atamalarını alıyoruz
    const assignmentsResult = await pool.query(
      `
      SELECT personnel_id, assignment_date FROM shift_assignments
      WHERE assignment_date BETWEEN $1 AND $2
      AND personnel_id = ANY($3::int[])
      `,
      [weekStart, weekEnd, personnelIds]
    );

    const offDaysResult = await pool.query(
      `
      SELECT personnel_id, assignment_date FROM personnel_off_days
      WHERE assignment_date BETWEEN $1 AND $2
      AND personnel_id = ANY($3::int[])
      `,
      [weekStart, weekEnd, personnelIds]
    );

    const existingAssignments = assignmentsResult.rows.concat(offDaysResult.rows);

    // Boşta kalan günleri tespit edip izin ataması yapıyoruz
    for (const personnelId of personnelIds) {
      for (const date of datesInRange) {
        const hasAssignment = existingAssignments.some(
          assignment =>
            assignment.personnel_id === personnelId &&
            assignment.assignment_date === date
        );

        if (!hasAssignment) {
          // İzin günü ataması yapıyoruz
          await pool.query(
            `
            INSERT INTO personnel_off_days (personnel_id, assignment_date)
            VALUES ($1, $2)
            `,
            [personnelId, date]
          );
        }
      }
    }

    console.log('Boşta kalan günlere izin ataması tamamlandı.');
  } catch (error) {
    console.error('Error assigning leaves to empty days:', error);
    throw error;
  }
}


// Vardiya türleri routes
router.get('/shift-types', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM shift_types 
            WHERE is_active = true
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/shift-types', authenticateToken, async (req, res) => {
    const { name, description } = req.body;
    try {
        const result = await pool.query(`
            INSERT INTO shift_types (name, description)
            VALUES ($1, $2)
            RETURNING *
        `, [name, description]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vardiya planları routes
router.get('/shift-schedules', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ss.*, st.name as shift_type_name
            FROM shift_schedules ss
            JOIN shift_types st ON ss.shift_type_id = st.id
            WHERE ss.is_active = true
            ORDER BY ss.start_time
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vardiya planları routes
router.post('/shift-schedules', authenticateToken, async (req, res) => {
    const { shift_type_id, name, start_time, end_time, color } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO shift_schedules 
        (shift_type_id, name, start_time, end_time, color)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [shift_type_id, name, start_time, end_time, color]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// Departman vardiya ayarları routes
router.get('/department-shift-settings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT dss.*, d.name as department_name, st.name as shift_type_name
            FROM department_shift_settings dss
            JOIN departments d ON dss.department_id = d.id
            JOIN shift_types st ON dss.shift_type_id = st.id
            WHERE dss.is_active = true
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/department-shift-settings', authenticateToken, async (req, res) => {
    const { 
        department_id, 
        shift_type_id, 
        has_fixed_schedule,
        fixed_start_time,
        fixed_end_time,
        work_days 
    } = req.body;

    try {
        const result = await pool.query(`
            INSERT INTO department_shift_settings 
            (department_id, shift_type_id, has_fixed_schedule, 
             fixed_start_time, fixed_end_time, work_days)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            department_id, 
            shift_type_id, 
            has_fixed_schedule,
            fixed_start_time,
            fixed_end_time,
            work_days
        ]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});





// Vardiya Türü Silme
router.delete('/shift-types/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`
            UPDATE shift_types 
            SET is_active = false, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1
        `, [id]);
        res.status(200).json({ message: 'Vardiya türü başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vardiya Planı Silme
router.delete('/shift-schedules/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`
            UPDATE shift_schedules 
            SET is_active = false, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1
        `, [id]);
        res.status(200).json({ message: 'Vardiya planı başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Departman Vardiya Ayarı Silme
router.delete('/department-shift-settings/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`
            UPDATE department_shift_settings 
            SET is_active = false, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1
        `, [id]);
        res.status(200).json({ message: 'Departman vardiya ayarı başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// routes/shifts.js dosyasına eklenecek

// Vardiya atamalarını getir
// routes/shifts.js

// Vardiya atamalarını getir
router.get('/personnel-shift-assignments', async (req, res) => {
  try {
    const { department_id, start_date, end_date } = req.query;
    
    console.log('Fetching assignments with params:', {
      start_date,
      end_date,
      department_id
    });

    // Önce personnel tablosunun yapısını kontrol edelim
    const checkQuery = "SELECT column_name FROM information_schema.columns WHERE table_name = 'personnel'";
    const columnResult = await pool.query(checkQuery);
    console.log('Personnel table columns:', columnResult.rows);

    const query = `
      SELECT 
        sa.id,
        sa.personnel_id,
        sa.shift_schedule_id,
        sa.assignment_date,
        p.first_name || ' ' || p.last_name as personnel_name,
        ss.name as shift_name,
        ss.start_time,
        ss.end_time,
        ss.color
      FROM 
        shift_assignments sa
        JOIN personnel p ON sa.personnel_id = p.id
        JOIN personnel_departments dp ON p.id = dp.personnel_id
        LEFT JOIN shift_schedules ss ON sa.shift_schedule_id = ss.id
      WHERE 
        dp.department_id = $1
        AND sa.assignment_date BETWEEN $2 AND $3
        AND sa.status = 'active'
      ORDER BY sa.assignment_date, sa.personnel_id
    `;

    const result = await pool.query(query, [department_id, start_date, end_date]);
    
    console.log('Query results:', {
      count: result.rowCount,
      sample: result.rows[0]
    });

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching shift assignments:', error);
    res.status(500).json({ error: error.message });
  }
});





// routes/shifts.js'e eklenecek yeni route'lar

// Otomatik vardiya atama endpoint'i
// routes/shifts.js

// Otomatik vardiya atama endpoint'i
router.post('/auto-assignments', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            startDate,
            endDate,
            departmentId,
            personnelIds,
            shiftScheduleId,
            daysOff,
            includeWeekends
        } = req.body;

        await client.query('BEGIN');

        const startDateTime = dayjs(startDate);
        const endDateTime = dayjs(endDate);
        const workDays = [];

        // Çalışma günlerini belirle
        let currentDate = startDateTime.clone();
        while (currentDate <= endDateTime) {
            const isWeekend = currentDate.day() === 0 || currentDate.day() === 6;
            if (includeWeekends || !isWeekend) {
                workDays.push(currentDate.format('YYYY-MM-DD'));
            }
            currentDate = currentDate.add(1, 'day');
        }

        // Temel hesaplamalar
        const totalDays = workDays.length;
        const workDaysPerPerson = totalDays - daysOff;
        const totalShifts = personnelIds.length * workDaysPerPerson;
        const dailyShifts = Math.floor(totalShifts / totalDays);
        let remainingShifts = totalShifts % totalDays; // 'const' yerine 'let' kullanıldı

        console.log('Assignment parameters:', {
            totalDays,
            workDaysPerPerson,
            totalShifts,
            dailyShifts,
            remainingShifts
        });

        // Mevcut atamaları temizle
        await client.query(`
            DELETE FROM shift_assignments 
            WHERE assignment_date = ANY($1)
            AND personnel_id = ANY($2)
        `, [workDays, personnelIds]);

        // Mevcut izin günlerini temizle (isteğe bağlı)
        await client.query(`
            DELETE FROM personnel_off_days
            WHERE assignment_date = ANY($1)
            AND personnel_id = ANY($2)
        `, [workDays, personnelIds]);

        // Her gün için vardiya dağılımını yap
        const assignments = {};
        const personnelWorkDays = {};
        personnelIds.forEach(id => {
            personnelWorkDays[id] = workDaysPerPerson;
        });

        // Her gün için vardiya dağılımını yap
        for (const dateStr of workDays) {
            const targetShifts = dailyShifts + (remainingShifts > 0 ? 1 : 0);
            if (remainingShifts > 0) remainingShifts--; // remainingShifts değerini azaltın
            assignments[dateStr] = [];

            // O gün için uygun personeli seç
            const availablePersonnel = personnelIds
                .filter(id => personnelWorkDays[id] > 0)
                .sort((a, b) => personnelWorkDays[b] - personnelWorkDays[a]);

            for (let i = 0; i < targetShifts && i < availablePersonnel.length; i++) {
                const personnelId = availablePersonnel[i];
                assignments[dateStr].push(personnelId);
                personnelWorkDays[personnelId]--;
            }
        }

        // Atamaları veritabanına kaydet
        for (const [dateStr, personnelList] of Object.entries(assignments)) {
            for (const personnelId of personnelList) {
                await client.query(`
                    INSERT INTO shift_assignments 
                    (shift_schedule_id, personnel_id, assignment_date, status)
                    VALUES ($1, $2, $3, 'active')
                `, [shiftScheduleId, personnelId, dateStr]);
            }
        }

        // Boşta kalan günlere izin ataması yap
        // Öncelikle mevcut atamaları birleştirelim
        const assignedPersonnelDates = new Set();
        for (const [dateStr, personnelList] of Object.entries(assignments)) {
            for (const personnelId of personnelList) {
                assignedPersonnelDates.add(`${personnelId}-${dateStr}`);
            }
        }

        // Tüm personel ve tarihler için atama olmayanları bulalım
        const offDayInserts = [];
        for (const personnelId of personnelIds) {
            for (const dateStr of workDays) {
                const key = `${personnelId}-${dateStr}`;
                if (!assignedPersonnelDates.has(key)) {
                    // İzin gününü ekleyelim
                    offDayInserts.push({
                        personnel_id: personnelId,
                        assignment_date: dateStr
                    });
                }
            }
        }

        // İzin günlerini veritabanına kaydet
        for (const offDay of offDayInserts) {
            await client.query(`
                INSERT INTO personnel_off_days (personnel_id, assignment_date)
                VALUES ($1, $2)
            `, [offDay.personnel_id, offDay.assignment_date]);
        }

        await client.query('COMMIT');

        res.json({
            message: 'Vardiya ataması ve izin günleri başarıyla tamamlandı',
            distribution: Object.entries(assignments).reduce((acc, [date, personnel]) => {
                acc[date] = personnel.length;
                return acc;
            }, {})
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in auto assignment:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        client.release();
    }
});


  // Geçen haftanın vardiyalarını kopyalama endpoint'i
  // Güncellenmiş /copy-last-week endpoint'i

  router.post('/copy-last-week', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const { startDate, endDate, departmentId } = req.body;
  
      await client.query('BEGIN');
  
      // Haftanın başlangıcını (Pazartesi) bul
      const currentWeekStart = dayjs(startDate).startOf('week').add(1, 'day'); // Pazartesi
      const currentWeekEnd = currentWeekStart.add(6, 'day'); // Pazar
  
      // Geçen haftanın başlangıcını ve bitişini hesapla
      const lastWeekStart = currentWeekStart.subtract(7, 'day');
      const lastWeekEnd = lastWeekStart.add(6, 'day');
  
      console.log('Date ranges:', {
        currentWeekStart: currentWeekStart.format('YYYY-MM-DD'),
        currentWeekEnd: currentWeekEnd.format('YYYY-MM-DD'),
        lastWeekStart: lastWeekStart.format('YYYY-MM-DD'),
        lastWeekEnd: lastWeekEnd.format('YYYY-MM-DD')
      });
  
      // Hedef haftadaki mevcut vardiya atamalarını ve izin günlerini sil
      await client.query(`
        DELETE FROM shift_assignments sa
        USING personnel_departments pd
        WHERE sa.personnel_id = pd.personnel_id
        AND pd.department_id = $1
        AND sa.assignment_date BETWEEN $2 AND $3
      `, [
        departmentId,
        currentWeekStart.format('YYYY-MM-DD'),
        currentWeekEnd.format('YYYY-MM-DD')
      ]);
  
      await client.query(`
        DELETE FROM personnel_off_days pod
        USING personnel_departments pd
        WHERE pod.personnel_id = pd.personnel_id
        AND pd.department_id = $1
        AND pod.assignment_date BETWEEN $2 AND $3
      `, [
        departmentId,
        currentWeekStart.format('YYYY-MM-DD'),
        currentWeekEnd.format('YYYY-MM-DD')
      ]);
  
      // Geçen haftanın vardiya atamalarını al
      const lastWeekShifts = await client.query(`
        SELECT 
          sa.*,
          p.id as personnel_id,
          sa.assignment_date
        FROM shift_assignments sa
        JOIN personnel p ON sa.personnel_id = p.id
        JOIN personnel_departments pd ON p.id = pd.personnel_id
        WHERE pd.department_id = $1
        AND sa.assignment_date BETWEEN $2 AND $3
        AND sa.status = 'active'
        ORDER BY sa.assignment_date
      `, [
        departmentId,
        lastWeekStart.format('YYYY-MM-DD'),
        lastWeekEnd.format('YYYY-MM-DD')
      ]);
  
      // Geçen haftanın izin günlerini al
      const lastWeekOffDays = await client.query(`
        SELECT 
          pod.*,
          p.id as personnel_id,
          pod.assignment_date
        FROM personnel_off_days pod
        JOIN personnel p ON pod.personnel_id = p.id
        JOIN personnel_departments pd ON p.id = pd.personnel_id
        WHERE pd.department_id = $1
        AND pod.assignment_date BETWEEN $2 AND $3
        ORDER BY pod.assignment_date
      `, [
        departmentId,
        lastWeekStart.format('YYYY-MM-DD'),
        lastWeekEnd.format('YYYY-MM-DD')
      ]);
  
      // Her vardiyayı aynı haftanın gününe kopyala
      for (const shift of lastWeekShifts.rows) {
        const shiftDate = dayjs(shift.assignment_date);
        const dayIndex = shiftDate.diff(lastWeekStart, 'day');
        const newDate = currentWeekStart.add(dayIndex, 'day');
  
        await client.query(`
          INSERT INTO shift_assignments 
          (shift_schedule_id, personnel_id, assignment_date, status)
          VALUES ($1, $2, $3, 'active')
        `, [
          shift.shift_schedule_id,
          shift.personnel_id,
          newDate.format('YYYY-MM-DD')
        ]);
      }
  
      // Her izin gününü aynı haftanın gününe kopyala
      for (const offDay of lastWeekOffDays.rows) {
        const offDayDate = dayjs(offDay.assignment_date);
        const dayIndex = offDayDate.diff(lastWeekStart, 'day');
        const newDate = currentWeekStart.add(dayIndex, 'day');
  
        await client.query(`
          INSERT INTO personnel_off_days 
          (personnel_id, assignment_date)
          VALUES ($1, $2)
        `, [
          offDay.personnel_id,
          newDate.format('YYYY-MM-DD')
        ]);
      }
  
      await client.query('COMMIT');
      res.json({
        message: 'Geçen haftanın vardiyaları ve izin günleri başarıyla kopyalandı',
        shiftCount: lastWeekShifts.rows.length,
        offDayCount: lastWeekOffDays.rows.length,
        dateRanges: {
          lastWeek: {
            start: lastWeekStart.format('YYYY-MM-DD'),
            end: lastWeekEnd.format('YYYY-MM-DD')
          },
          currentWeek: {
            start: currentWeekStart.format('YYYY-MM-DD'),
            end: currentWeekEnd.format('YYYY-MM-DD')
          }
        }
      });
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error copying shifts and off days:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      client.release();
    }
  });
  


// İzin günlerini güncelleme endpoint'i
router.put('/off-days/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { assignment_date, personnel_id } = req.body;
  
    try {
      // İzin gününü güncelle
      // Veritabanınızda izin günlerini tutan bir tablo oluşturmalısınız (örneğin, personnel_off_days)
      await pool.query(`
        UPDATE personnel_off_days
        SET assignment_date = $1, personnel_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [assignment_date, personnel_id, id]);
  
      res.status(200).json({ message: 'İzin günü güncellendi' });
    } catch (error) {
      console.error('Error updating off day:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

// İzin günlerini getir
router.get('/off-days', authenticateToken, async (req, res) => {
    const { startDate, endDate, departmentId } = req.query;
  
    try {
      const result = await pool.query(
        `
        SELECT
          pod.id,
          pod.personnel_id,
          pod.assignment_date,
          'İzin' as shift_name,
          '#52c41a' as color,
          true as is_off_day
        FROM personnel_off_days pod
        JOIN personnel_departments pd ON pod.personnel_id = pd.personnel_id
        WHERE pod.assignment_date BETWEEN $1 AND $2
        AND pd.department_id = $3
      `,
        [startDate, endDate, departmentId]
      );
  
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching off days:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

  // Yeni izin günü oluştur
  router.post('/off-days', authenticateToken, async (req, res) => {
    const { personnel_id, assignment_date } = req.body;
  
    try {
      const result = await pool.query(
        `
        INSERT INTO personnel_off_days (personnel_id, assignment_date)
        VALUES ($1, $2)
        RETURNING *
      `,
        [personnel_id, assignment_date]
      );
  
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating off day:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // İzin gününü güncelle
  router.put('/off-days/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { assignment_date, personnel_id } = req.body;
  
    try {
      await pool.query(
        `
        UPDATE personnel_off_days
        SET assignment_date = $1, personnel_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
        [assignment_date, personnel_id, id]
      );
  
      res.status(200).json({ message: 'İzin günü güncellendi' });
    } catch (error) {
      console.error('Error updating off day:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // İzin gününü sil
  router.delete('/off-days/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
  
    try {
      await pool.query(
        `
        DELETE FROM personnel_off_days
        WHERE id = $1
      `,
        [id]
      );
  
      res.status(200).json({ message: 'İzin günü silindi' });
    } catch (error) {
      console.error('Error deleting off day:', error);
      res.status(500).json({ error: error.message });
    }
  });


  router.get('/preview', authenticateToken, async (req, res) => {
    const { departmentId, start_date, end_date } = req.query;

    if(!departmentId || !start_date || !end_date) {
        return res.status(400).json({ error: 'Gerekli parametreler eksik' });
    }

    try {
        const assignmentsResult = await pool.query(`
            SELECT sa.*, ss.name as shift_name, ss.start_time, ss.end_time,
                   p.first_name, p.last_name, d.name as department_name
            FROM shift_assignments sa
            JOIN shift_schedules ss ON sa.shift_schedule_id = ss.id
            JOIN personnel p ON sa.personnel_id = p.id
            JOIN personnel_departments pd ON p.id = pd.personnel_id
            JOIN departments d ON pd.department_id = d.id
            WHERE sa.assignment_date BETWEEN $2 AND $3
              AND pd.department_id = $1
            ORDER BY sa.assignment_date, ss.start_time
        `, [departmentId, start_date, end_date]);

        // assignmentsResult.rows içerisinde tüm atamalar var
        res.json({
            departmentId,
            startDate: start_date,
            endDate: end_date,
            assignments: assignmentsResult.rows
        });
    } catch(error) {
        console.error('Error previewing shifts:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// PDF oluşturma fonksiyonu
async function generatePdfFromData(data) {
  console.log('PDF Generation Started for:', data.name, data.startDate, data.endDate);
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument();
  let buffers = [];

  // Eğer PDF oluştururken bir hata alırsa bu loglanacak
  doc.on('error', (err) => {
    console.error('PDF generation error:', err);
  });

  doc.on('data', buffers.push.bind(buffers));
  
  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      console.log('PDF Generation Completed. PDF size:', pdfData.length);
      resolve(pdfData);
    });

    doc.on('error', reject);

    // Örnek bir içerik yazıyoruz, boş kalmasın:
    doc.fontSize(18).text('Vardiya Planınız', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Sayın ${data.name},`);
    doc.text(`${data.startDate} - ${data.endDate} tarihleri arasındaki vardiya planınız aşağıdadır:`);
    doc.moveDown();

    doc.fontSize(10).text('Tarih\t\tVardiya', { underline: true });

    // data.shifts’ten veri alıp gerçekten tablo oluşturduğumuzdan emin olun
    if (!data.shifts || data.shifts.length === 0) {
      doc.text('Bu tarih aralığında atama bulunamadı.');
    } else {
      data.shifts.forEach(shift => {
        doc.text(`${shift.date}\t\t${shift.shiftName} (${shift.startTime}-${shift.endTime})`);
      });
    }

    doc.end();
  });
}
// 2) Publish endpoint'i: Onaylandıktan sonra PDF oluşturup mail atar
router.post('/publish-pdf', authenticateToken, async (req, res) => {
    const { departmentId, startDate, endDate } = req.body;

    if(!departmentId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Parametreler eksik' });
    }

    try {
        // Departman personeli ve atamaları çek
        const personnelResult = await pool.query(`
            SELECT p.id, p.first_name, p.last_name, pc.email
            FROM personnel p
            JOIN personnel_departments pd ON p.id = pd.personnel_id
            JOIN personnel_contact pc ON p.id = pc.personnel_id
            WHERE pd.department_id = $1 
              AND p.is_active = true
        `, [departmentId]);
        const personnelList = personnelResult.rows;

        const assignmentsResult = await pool.query(`
            SELECT sa.*, ss.name as shift_name, ss.start_time, ss.end_time,
                   p.first_name, p.last_name, d.name as department_name
            FROM shift_assignments sa
            JOIN shift_schedules ss ON sa.shift_schedule_id = ss.id
            JOIN personnel p ON sa.personnel_id = p.id
            JOIN personnel_departments pd ON p.id = pd.personnel_id
            JOIN departments d ON pd.department_id = d.id
            WHERE sa.assignment_date BETWEEN $2 AND $3
              AND pd.department_id = $1
            ORDER BY sa.assignment_date, ss.start_time
        `, [departmentId, startDate, endDate]);

        const assignments = assignmentsResult.rows;

        // Personel bazında vardiya listesi
        const personnelShifts = {};
        assignments.forEach(a => {
            if(!personnelShifts[a.personnel_id]) {
                personnelShifts[a.personnel_id] = [];
            }
            personnelShifts[a.personnel_id].push({
                date: dayjs(a.assignment_date).format('DD.MM.YYYY'),
                shiftName: a.shift_name,
                startTime: a.start_time,
                endTime: a.end_time
            });
        });

      
              const mailData = {
                name: 'Ali Veli', // Örnek, gerçek isim loop ederken alınacak
                departmentName: 'Test Departmanı',
                startDate: '02.12.2024',
                endDate: '08.12.2024',
                shifts: [
                  // Buraya gerçekten doldurulan shift verileri gelecek
                  { date: '02.12.2024', shiftName: 'Sabah', startTime: '08:00', endTime: '16:00' }
                ]
              };
          
              const pdfBuffer = await generatePdfFromData(mailData);
          
              // PDF boyutunu kontrol edelim
              console.log('PDF Buffer length:', pdfBuffer.length);
          
              // Attachments eklemeden önce log
              console.log('Sending mail with PDF attachment...', {
                filename: 'Vardiya_Plani.pdf',
                bufferLength: pdfBuffer.length
              });
          
              await mailConfig.sendMail({
                to: 'ornek@mail.com',
                subject: 'Vardiya Planınız (PDF Ekiyle)',
                html: `<p>Sayın Ali Veli,<br/>Vardiya planınız ektedir.</p>`,
                attachments: [
                  {
                    filename: 'Vardiya_Plani.pdf',
                    content: pdfBuffer
                  }
                ]
              });
          
              res.json({ message: 'Vardiya planı mail olarak gönderildi (PDF)' });
            } catch(error) {
              console.error('Error publishing shifts with PDF:', error);
              res.status(500).json({ error: 'Sunucu hatası' });
            }
          });
  

module.exports = router;