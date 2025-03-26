const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const LeaveAllocationService = require('../services/leaveAllocationService');


// Leave Request API
// İzin talebi oluşturma endpoint'i
router.post('/leave-request', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      personnel_id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      work_days,
      total_days
    } = req.body;

    // Uygunluk kontrolü
    let eligibilityCheck;
    try {
      eligibilityCheck = await LeaveAllocationService.checkLeaveTypeEligibility(
        personnel_id, 
        leave_type_id,
        start_date,
        end_date
      );
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.message });
    }

    // İzin talebi oluştur
    const insertResult = await client.query(`
      INSERT INTO leave_requests (
        personnel_id,
        leave_type_id,
        start_date,
        end_date,
        status,
        work_days,
        total_days,
        reason,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'Pending', $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [personnel_id, leave_type_id, start_date, end_date, work_days, total_days, reason]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'İzin talebi başarıyla oluşturuldu',
      request_id: insertResult.rows[0].id,
      policy_details: eligibilityCheck.policy
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Onay bekleyen izinleri getir
router.get('/leaves/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lr.id,
        p.first_name || ' ' || p.last_name AS personnel_name,
        nlt.name AS leave_type_name,
        lr.start_date,
        lr.end_date,
        lr.status,
        lr.work_days,
        lr.total_days,
        lr.reason
      FROM leave_requests lr
      JOIN personnel p ON lr.personnel_id = p.id
      JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
      WHERE lr.status = 'Pending'
      ORDER BY lr.created_at DESC
    `);
    
    console.log('Pending leaves found:', result.rows.length);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching pending leave requests:', err);
    res.status(500).json({ error: err.message });
  }
});


// Onaylanan izinleri getir
router.get('/leaves/approved', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lr.id, 
        p.first_name || ' ' || p.last_name AS personnel_name, 
        nlt.name AS leave_type_name,
        lr.start_date, 
        lr.end_date, 
        lr.status 
      FROM leave_requests lr
      JOIN personnel p ON lr.personnel_id = p.id
      JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
      WHERE lr.status = 'Approved'
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching approved leave requests:', err.message, err.stack);
    res.status(500).send('Server Error');
  }
});


// Reddedilen izinleri getir
router.get('/leaves/rejected', async (req, res) => {
  try {
    const result = await pool.query(`
       SELECT 
        lr.id, 
        p.first_name || ' ' || p.last_name AS personnel_name, 
        nlt.name AS leave_type_name,
        lr.start_date, 
        lr.end_date, 
        lr.status 
      FROM leave_requests lr
      JOIN personnel p ON lr.personnel_id = p.id
      JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
      WHERE lr.status = 'Rejected'
     
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching rejected leave requests:', err.message, err.stack);
    res.status(500).send('Server Error');
  }
});


// Onay bekleyen izinleri getir - Personel ID'sine göre

router.get('/leaves/pending/:personnelId', async (req, res) => {
  const { personnelId } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        lr.id,
        p.first_name || ' ' || p.last_name AS personnel_name,
        nlt.name AS leave_type_name,
        lr.start_date,
        lr.end_date,
        lr.status,
        lr.work_days,
        lr.total_days,
        lr.reason
      FROM leave_requests lr
      JOIN personnel p ON lr.personnel_id = p.id
      JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
      WHERE lr.status = 'Pending' AND lr.personnel_id = $1
      ORDER BY lr.created_at DESC
    `, [personnelId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching pending leave requests:', err.message);
    res.status(500).send('Server Error');
  }
});


// Onaylanan izinleri getir - Personel ID'sine göre
router.get('/leaves/approved/:personnelId', async (req, res) => {
  const { personnelId } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        lr.id, 
        p.first_name || ' ' || p.last_name AS personnel_name, 
        nlt.name AS leave_type_name,
        lr.start_date, 
        lr.end_date, 
        lr.status 
      FROM leave_requests lr
      JOIN personnel p ON lr.personnel_id = p.id
      JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
      WHERE lr.status = 'Approved' AND lr.personnel_id = $1
      ORDER BY lr.created_at DESC
    `, [personnelId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching approved leave requests:', err.message);
    res.status(500).send('Server Error');
  }
});



// Reddedilen izinleri getir - Personel ID'sine göre
router.get('/leaves/rejected/:personnelId', async (req, res) => {
  const { personnelId } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        lr.id, 
        p.first_name || ' ' || p.last_name AS personnel_name, 
        nlt.name AS leave_type_name,
        lr.start_date, 
        lr.end_date, 
        lr.status 
      FROM leave_requests lr
      JOIN personnel p ON lr.personnel_id = p.id
      JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
      WHERE lr.status = 'Rejected' AND lr.personnel_id = $1
      ORDER BY lr.created_at DESC
    `, [personnelId]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching rejected leave requests:', err.message);
    res.status(500).send('Server Error');
  }
});


// Onaylanan izinleri reddet - ID ile
router.put('/leaves/:id/reject', async (req, res) => {
  const leaveId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if leave request exists
    const leaveExists = await client.query(
      'SELECT id FROM leave_requests WHERE id = $1',
      [leaveId]
    );

    if (leaveExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'İzin talebi bulunamadı' });
    }

    // Update status to rejected
    await client.query(
      'UPDATE leave_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['Rejected', leaveId]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'İzin talebi reddedildi' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('İzin reddetme hatası:', err);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: err.message 
    });
  } finally {
    client.release();
  }
});


// leave.js içinde approve endpoint'ini güncelle
// routes/leave.js - approve endpoint güncellemesi

router.put('/leaves/:id/approve', async (req, res) => {
  const { forceApprove } = req.body;
  const leaveId = req.params.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

// İzin talebini getir sorgusunu düzeltelim
const leaveRequest = await client.query(`
  SELECT 
    lr.*,
    nlt.name as leave_type_name
  FROM leave_requests lr 
  JOIN new_leave_types nlt ON lr.leave_type_id = nlt.id
  WHERE lr.id = $1
`, [leaveId]);

    if (leaveRequest.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'İzin talebi bulunamadı' });
    }

    const request = leaveRequest.rows[0];
    
    // Calculate days
    const totalDaysResult = await client.query(`
      SELECT (end_date::date - start_date::date + 1) as total_days
      FROM leave_requests WHERE id = $1
    `, [leaveId]);

    const totalDays = parseInt(totalDaysResult.rows[0].total_days);

    // Calculate work days
    const workDaysResult = await client.query(`
      WITH RECURSIVE dates AS (
        SELECT start_date::date AS date
        FROM leave_requests
        WHERE id = $1
        UNION ALL
        SELECT (date + interval '1 day')::date
        FROM dates
        WHERE date < (SELECT end_date::date FROM leave_requests WHERE id = $1)
      )
      SELECT COUNT(*) as work_days
      FROM dates d
      WHERE EXTRACT(DOW FROM d.date) NOT IN (0, 6)
      AND d.date NOT IN (
        SELECT holiday_date::date
        FROM public_holidays
        WHERE holiday_date BETWEEN 
          (SELECT start_date FROM leave_requests WHERE id = $1)
          AND (SELECT end_date FROM leave_requests WHERE id = $1)
      )
    `, [leaveId]);

    const workDays = parseInt(workDaysResult.rows[0].work_days);

    // Check balance
    const balanceCheck = await client.query(`
      SELECT 
        COALESCE(total_days, 0) as total_days,
        COALESCE(used_days, 0) as used_days,
        (COALESCE(total_days, 0) - COALESCE(used_days, 0)) as available_days
      FROM leave_balances
      WHERE personnel_id = $1 
      AND leave_type_id = $2 
      AND year = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::integer
    `, [request.personnel_id, request.leave_type_id]);

    const balance = balanceCheck.rows[0] || { total_days: 0, used_days: 0, available_days: 0 };

    if (!forceApprove && balance.available_days < workDays) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Yetersiz izin bakiyesi. Kalan: ${balance.available_days} gün, Talep edilen: ${workDays} gün`,
        requiresConfirmation: true,
        availableDays: balance.available_days,
        requestedDays: workDays,
        leaveTypeName: request.leave_type_name
      });
    }

    // Update leave request
    await client.query(`
      UPDATE leave_requests 
      SET 
        status = 'Approved',
        work_days = $2,
        total_days = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [leaveId, workDays, totalDays]);

    // Update balance
    if (balanceCheck.rows.length > 0) {
      await client.query(`
        UPDATE leave_balances 
        SET 
          used_days = used_days + $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE personnel_id = $2 
        AND leave_type_id = $3 
        AND year = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::integer
      `, [workDays, request.personnel_id, request.leave_type_id]);
    } else {
      const defaultDays = await client.query(`
        SELECT days_entitled 
        FROM leave_policies 
        WHERE leave_type_id = $1 
        ORDER BY years_of_service ASC 
        LIMIT 1
      `, [request.leave_type_id]);

      const annualDays = defaultDays.rows[0]?.days_entitled || workDays;
      
      await client.query(`
        INSERT INTO leave_balances 
        (personnel_id, leave_type_id, year, total_days, used_days)
        VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::integer, $3, $4)
      `, [request.personnel_id, request.leave_type_id, annualDays, workDays]);
    }

    await client.query('COMMIT');
    res.status(200).json({ 
      message: forceApprove ? 
        'İzin talebi yetersiz bakiyeye rağmen onaylandı' : 
        'İzin talebi başarıyla onaylandı',
      workDays,
      totalDays,
      availableDays: balance.available_days - workDays,
      leaveTypeName: request.leave_type_name
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('İzin onaylama hatası:', err);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: err.message
    });
  } finally {
    client.release();
  }
});

// İzin bakiyelerini getir
// routes/leave_balances.js
// routes/leave_balances.js
router.get('/leave-balance/:personnelId', async (req, res) => {
  const { personnelId } = req.params;
  try {
      console.log('Fetching leave balance for personnel:', personnelId);
      
      // Önce personel için kayıt var mı kontrol edelim
      const checkBalance = await pool.query(`
          SELECT COUNT(*) 
          FROM leave_balances 
          WHERE personnel_id = $1 
          AND year = EXTRACT(YEAR FROM CURRENT_DATE)`,
          [personnelId]
      );

      // Eğer kayıt yoksa, otomatik olarak oluşturalım
      if (checkBalance.rows[0].count === '0') {
          // Her izin türü için bakiye oluştur
          const leaveTypes = await pool.query('SELECT id FROM leave_type');
          
          for (const type of leaveTypes.rows) {
              // İzin politikasından hak edilen gün sayısını al
              const policyResult = await pool.query(`
                  SELECT days_entitled 
                  FROM leave_policy 
                  WHERE leave_type_id = $1 
                  ORDER BY years_of_service ASC 
                  LIMIT 1`,
                  [type.id]
              );

              if (policyResult.rows.length > 0) {
                  await pool.query(`
                      INSERT INTO leave_balances 
                      (personnel_id, leave_type_id, year, total_days, days_used)
                      VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE)::integer, $3, 0)
                      ON CONFLICT (personnel_id, leave_type_id, year) 
                      DO NOTHING`,
                      [personnelId, type.id, policyResult.rows[0].days_entitled]
                  );
              }
          }
      }

      // Güncel bakiyeleri getir
      const result = await pool.query(`
        SELECT 
            alb.id,
            alb.year,
            lt.name as leave_type_name,
            alb.total_days,
            alb.used_days,
            (alb.total_days - alb.used_days) as remaining_days,
            lt.id as leave_type_id
        FROM leave_balances alb
        JOIN leave_types lt ON alb.leave_type_id = lt.id
        WHERE alb.personnel_id = $1 
        AND alb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    `, [personnelId]);
      
      console.log('Query result:', result.rows);
      res.json(result.rows);
  } catch (err) {
      console.error('Detailed error in fetching leave balance:', err);
      res.status(500).json({ 
          error: 'Server error', 
          details: err.message,
          stack: err.stack 
      });
  }
});

// Yıllık izin bakiyesi oluştur/güncelle
router.post('/leave-balance/initialize', async (req, res) => {
  const { personnel_id, year } = req.body;
  const client = await pool.connect();

  try {
      await client.query('BEGIN');

      // Her izin türü için bakiye oluştur
      const leaveTypes = await client.query('SELECT * FROM leave_type');
      
      for (const leaveType of leaveTypes.rows) {
          // İzin politikasından hak edilen gün sayısını al
          const policyResult = await client.query(`
              SELECT days_entitled 
              FROM leave_policy 
              WHERE leave_type_id = $1 
              ORDER BY years_of_service DESC 
              LIMIT 1
          `, [leaveType.id]);

          if (policyResult.rows.length > 0) {
              const totalDays = policyResult.rows[0].days_entitled;
              
              // Mevcut bakiyeyi kontrol et
              const existingBalance = await client.query(`
                  SELECT id FROM leave_balances 
                  WHERE personnel_id = $1 AND leave_type_id = $2 AND year = $3
              `, [personnel_id, leaveType.id, year]);

              if (existingBalance.rows.length === 0) {
                  // Yeni bakiye oluştur
                  await client.query(`
                      INSERT INTO leave_balances 
                      (personnel_id, leave_type_id, year, total_days, used_days, remaining_days)
                      VALUES ($1, $2, $3, $4, 0, $4)
                  `, [personnel_id, leaveType.id, year, totalDays]);
              }
          }
      }

      await client.query('COMMIT');
      res.json({ message: 'Leave balance initialized successfully' });
  } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error initializing leave balance:', err);
      res.status(500).json({ error: 'Server error' });
  } finally {
      client.release();
  }
});


// check-balance endpoint'inde work_days kullanımını ekle
router.post('/check-balance', async (req, res) => {
  const { personnel_id, leave_type_id, requested_days } = req.body;

  try {
    // Önce izin türünü kontrol et
    const leaveType = await pool.query(`
      SELECT * FROM new_leave_types WHERE id = $1
    `, [leave_type_id]);

    if (!leaveType.rows.length) {
      return res.status(404).json({ error: 'İzin türü bulunamadı' });
    }

    // Eğer event based ise ve bakiye yoksa oluştur
    if (leaveType.rows[0].is_event_based) {
      await LeaveAllocationService.handleEventBasedLeave(personnel_id, leaveType.rows[0]);
    }

    // Bakiye kontrolü
    const balanceCheck = await pool.query(`
      SELECT 
        lb.total_days,
        lb.used_days,
        (lb.total_days - lb.used_days) as remaining_days
      FROM leave_balances lb
      WHERE lb.personnel_id = $1 
      AND lb.leave_type_id = $2 
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    `, [personnel_id, leave_type_id]);

    if (balanceCheck.rows.length === 0) {
      return res.status(404).json({ error: 'İzin bakiyesi bulunamadı' });
    }

    const remainingDays = balanceCheck.rows[0].remaining_days;

    if (remainingDays < requested_days) {
      return res.status(400).json({ 
        error: `Yetersiz bakiye. Mevcut: ${remainingDays} gün, Talep edilen: ${requested_days} gün`,
        remainingDays,
        requested_days
      });
    }

    res.json({ 
      message: 'Leave balance is sufficient',
      remainingDays,
      requested_days
    });
  } catch (err) {
    console.error('Error checking leave balance:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// İzin kullanımını güncelle
router.put('/leave-balance/update', async (req, res) => {
  const { personnel_id, leave_type_id, used_days } = req.body;
  const year = new Date().getFullYear();

  try {
      const result = await pool.query(`
          UPDATE leave_balances 
          SET used_days = used_days + $1,
              remaining_days = total_days - (used_days + $1)
          WHERE personnel_id = $2 
          AND leave_type_id = $3 
          AND year = $4
          RETURNING *
      `, [used_days, personnel_id, leave_type_id, year]);

      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error updating leave balance:', err);
      res.status(500).json({ error: 'Server error' });
  }
});



// handle-event-based-leave endpoint'inde
router.post('/handle-event-based-leave', async (req, res) => {
  const { personnel_id, leave_type_id } = req.body;
  
  try {
    const leaveType = await pool.query(`
      SELECT id, code, is_event_based, max_days, name 
      FROM new_leave_types 
      WHERE id = $1
    `, [leave_type_id]);

    if (!leaveType.rows[0]?.is_event_based) {
      return res.status(400).json({ error: 'Bu izin türü olay bazlı değil' });
    }

    const result = await LeaveAllocationService.handleEventBasedLeave(
      personnel_id, 
      leaveType.rows[0]
    );

    res.json(result);
  } catch (error) {
    console.error('Error handling event based leave:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
});




// routes/leave.js içine eklenecek

router.get('/leave-balances/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
    lb.id as balance_id,
    lb.personnel_id,
    lb.leave_type_id,
    p.first_name || ' ' || p.last_name as personnel_name,
    nlt.name as leave_type_name,
    lb.total_days,
    COALESCE(lb.used_days, 0) as used_days,
    (lb.total_days - COALESCE(lb.used_days, 0)) as remaining_days,
    lb.year,
    lb.next_renewal_date,
    rp.renewal_type,
    rp.name as renewal_period_name,
    CASE 
        WHEN rp.renewal_type = 'YEARLY' THEN 
            make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1, rp.renewal_month, rp.renewal_day)
        WHEN rp.renewal_type = 'SERVICE_BASED' THEN 
            (SELECT hire_date + ((EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date))::integer + 1) * interval '1 year')
             FROM hire_termination_history 
             WHERE personnel_id = p.id AND termination_date IS NULL)
        WHEN rp.renewal_type = 'MONTHLY' THEN 
            (date_trunc('month', CURRENT_DATE) + interval '1 month' + (rp.renewal_day - 1) * interval '1 day')::date
        ELSE NULL
    END as calculated_next_renewal
FROM leave_balances lb
JOIN personnel p ON lb.personnel_id = p.id
JOIN new_leave_types nlt ON lb.leave_type_id = nlt.id
JOIN new_leave_renewal_periods rp ON nlt.renewal_period_id = rp.id
WHERE lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
AND (nlt.is_event_based = false OR lb.used_days > 0)
ORDER BY p.first_name, p.last_name, nlt.name;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('İzin bakiyeleri getirme hatası:', err);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: err.message 
    });
  }
});


router.get('/leave-balances/summary/normal', async (req, res) => {
  try {
    console.log('Incoming request for leave balance with personnel_id:', req.query.personnel_id);
    const personnelId = req.query.personnel_id;

    if (!personnelId) {
      return res.status(400).json({ error: 'Personel ID eksik' });
    }

    const result = await pool.query(`
      SELECT 
        SUM(lb.total_days - COALESCE(lb.used_days, 0)) AS total_remaining_days
      FROM leave_balances lb
      JOIN new_leave_types nlt ON lb.leave_type_id = nlt.id
      WHERE lb.personnel_id = $1
      AND nlt.is_event_based = false
      AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    `, [personnelId]);

    res.json({
      personnel_id: personnelId,
      total_remaining_days: result.rows[0]?.total_remaining_days || 0
    });
  } catch (err) {
    console.error('Normal izin bakiyesi getirme hatası:', err);
    res.status(500).json({ 
      error: 'Sunucu hatası',
      details: err.message 
    });
  }
});



// Yeni personel için izin bakiyesi oluştur
router.post('/leave-balance/initialize', async (req, res) => {
    const { personnel_id } = req.body;
    try {
        const result = await LeaveAllocationService.createInitialLeaveBalances(personnel_id);
        res.json(result);
    } catch (err) {
        console.error('Error initializing leave balance:', err);
        res.status(500).json({
            error: 'Server error',
            details: err.message
        });
    }
});

// Tüm personel için izin bakiyelerini güncelle// routes/leave.js veya ilgili route dosyası
// routes/leave.js

router.post('/leave-balance/update-all', async (req, res) => {
  try {
      const result = await LeaveAllocationService.updateAllPersonnelLeaves();
      res.json(result);
  } catch (error) {
      console.error('Error updating all leave balances:', error);
      res.status(500).json({
          success: false,
          error: 'İzin bakiyeleri güncellenirken bir hata oluştu',
          details: error.message,
          technicalDetails: process.env.NODE_ENV === 'development' ? error : undefined
      });
  }
});


// routes/leave.js

router.post('/leave-balance/reset-all', async (req, res) => {
  try {
      const result = await LeaveAllocationService.resetAndRecalculateAllLeaveBalances();
      res.json(result);
  } catch (error) {
      console.error('Error resetting leave balances:', error);
      res.status(500).json({
          success: false,
          error: 'İzin bakiyeleri sıfırlanırken bir hata oluştu',
          details: error.message
      });
  }
});





// routes/leaveCalculationMethod.js
router.get('/new-leave-calculation-methods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM new_leave_calculation_methods');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leave calculation methods:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// routes/leaveRenewalPeriod.js
router.get('/new-leave-renewal-periods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM new_leave_renewal_periods');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching leave renewal periods:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// Belirli bir izin türünün detaylarını getir
router.get('/new-leave-types/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        is_event_based,
        max_days,
        calculation_method_id,
        renewal_period_id
      FROM new_leave_types 
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'İzin türü bulunamadı' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching leave type:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// leave.js içine eklenecek
router.post('/check-eligibility', async (req, res) => {
  const { personnel_id, leave_type_id } = req.body;

  try {
      console.log('Checking eligibility for personnel:', personnel_id, 'leave type:', leave_type_id);
      
      // Önce personel bilgilerini logla
      const personnelQuery = await pool.query('SELECT * FROM personnel WHERE id = $1', [personnel_id]);
      console.log('Personnel details:', personnelQuery.rows[0]);
      
      // Sonra izin türü bilgilerini logla
      const leaveTypeQuery = await pool.query('SELECT * FROM new_leave_types WHERE id = $1', [leave_type_id]);
      console.log('Leave type details:', leaveTypeQuery.rows[0]);
      
      // Eligibility kontrolünü yap
      await LeaveAllocationService.checkLeaveTypeEligibility(personnel_id, leave_type_id);
      res.json({ message: 'Eligibility check passed' });
  } catch (error) {
      console.error('Detailed eligibility check error:', error);
      res.status(400).json({ 
          error: error.message,
          details: process.env.NODE_ENV === 'development' ? error : undefined
      });
  }
});


router.post('/bulk-leave-balance-update', async (req, res) => {
  const client = await pool.connect();
  try {
      await client.query('BEGIN');
      
      const { department_id, leave_type_id, days_to_add, reason, selected_personnel } = req.body;
      console.log('Gelen veriler:', { department_id, leave_type_id, days_to_add, reason, selected_personnel });

      // Kullanıcı ID'sini token'dan al
      const userId = req.user?.userId || req.user?.id || null;
      console.log('Token kullanıcı bilgisi:', req.user);
      console.log('Kullanıcı ID:', userId);

      // Etkilenecek personeli bul
      let personnelQuery = `
          SELECT DISTINCT 
              p.id, 
              CONCAT(p.first_name, ' ', p.last_name) as full_name
          FROM personnel p
          INNER JOIN personnel_departments pd ON p.id = pd.personnel_id
          WHERE p.is_active = true AND pd.department_id = $1
      `;
      
      const queryParams = [department_id];

      if (selected_personnel && selected_personnel.length > 0) {
          personnelQuery += ` AND p.id = ANY($2)`;
          queryParams.push(selected_personnel);
      }

      const personnel = await client.query(personnelQuery, queryParams);
      console.log('Etkilenecek personel:', personnel.rows);

      // Her personel için bakiye güncelleme
      for (const person of personnel.rows) {
          console.log(`${person.full_name} için işlem başlıyor...`);

          try {
              // Mevcut bakiyeyi kontrol et
              const balanceCheck = await client.query(`
                  SELECT * FROM leave_balances
                  WHERE personnel_id = $1 
                  AND leave_type_id = $2
                  AND year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
              `, [person.id, leave_type_id]);

              console.log('Mevcut bakiye:', balanceCheck.rows[0]);

              let balanceResult;
              if (balanceCheck.rows.length > 0) {
                  // Mevcut bakiyeyi güncelle
                  balanceResult = await client.query(`
                      UPDATE leave_balances 
                      SET 
                          total_days = total_days + $1,
                          last_calculated_at = CURRENT_TIMESTAMP
                      WHERE 
                          personnel_id = $2 
                          AND leave_type_id = $3
                          AND year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
                      RETURNING *
                  `, [days_to_add, person.id, leave_type_id]);
              } else {
                  // Yeni bakiye oluştur
                  balanceResult = await client.query(`
                      INSERT INTO leave_balances 
                      (personnel_id, leave_type_id, year, total_days, used_days, last_calculated_at)
                      VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE)::integer, $3, 0, CURRENT_TIMESTAMP)
                      RETURNING *
                  `, [person.id, leave_type_id, days_to_add]);
              }

              console.log('Bakiye işlem sonucu:', balanceResult.rows[0]);

              // Log kaydı
              await client.query(`
                  INSERT INTO leave_balance_logs 
                  (personnel_id, leave_type_id, action_type, days_changed, reason, created_by)
                  VALUES ($1, $2, 'BULK_ADD', $3, $4, $5)
              `, [
                  person.id, 
                  leave_type_id, 
                  days_to_add, 
                  reason,
                  userId || null  // Eğer userId null ise, null olarak kaydet
              ]);

              console.log(`${person.full_name} için işlem tamamlandı`);
          } catch (error) {
              console.error(`${person.full_name} için hata:`, error);
              throw error;
          }
      }

      await client.query('COMMIT');
      console.log('Tüm işlemler başarıyla tamamlandı');

      res.json({
          success: true,
          message: `${personnel.rows.length} personel için izin bakiyesi güncellendi`
      });
  } catch (error) {
      await client.query('ROLLBACK');
      console.error('Bulk update error:', error);
      res.status(500).json({ 
          error: 'İzin bakiyesi güncellenirken hata oluştu',
          details: error.message 
      });
  } finally {
      client.release();
  }
});

// Önizleme endpoint'i
router.post('/preview-bulk-update', async (req, res) => {
  try {
      const { department_id, leave_type_id, days_to_add, selected_personnel } = req.body;
      
      let query = `
          SELECT 
              p.id,
              CONCAT(p.first_name, ' ', p.last_name) as personnel_name,
              COALESCE(lb.total_days - COALESCE(lb.used_days, 0), 0) as current_balance
          FROM personnel p
          INNER JOIN personnel_departments pd ON p.id = pd.personnel_id
          LEFT JOIN leave_balances lb ON p.id = lb.personnel_id 
              AND lb.leave_type_id = $1 
              AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
          WHERE pd.department_id = $2 AND p.is_active = true
      `;
      
      const params = [leave_type_id, department_id];

      if (selected_personnel && selected_personnel.length > 0) {
          query += ` AND p.id = ANY($3)`;
          params.push(selected_personnel);
      }

      query += ` ORDER BY p.first_name, p.last_name`;

      const personnelQuery = await pool.query(query, params);

      const previewData = personnelQuery.rows.map(person => ({
          ...person,
          new_balance: (person.current_balance || 0) + days_to_add
      }));

      res.json(previewData);
  } catch (error) {
      console.error('Preview error:', error);
      res.status(500).json({ 
          error: 'Önizleme oluşturulurken hata oluştu',
          details: error.message 
      });
  }
});

// Güncelleme sonrası bakiyeleri kontrol etmek için yeni endpoint
router.get('/verify-balance-update', async (req, res) => {
  try {
      const { department_id, leave_type_id } = req.query;
      
      const result = await pool.query(`
          SELECT 
              p.id,
              CONCAT(p.first_name, ' ', p.last_name) as full_name,
              lb.total_days,
              lb.used_days,
              lb.last_calculated_at,
              lbl.action_type,
              lbl.days_changed,
              lbl.reason,
              lbl.created_at as log_created_at
          FROM personnel p
          INNER JOIN personnel_departments pd ON p.id = pd.personnel_id
          LEFT JOIN leave_balances lb ON p.id = lb.personnel_id 
              AND lb.leave_type_id = $1
              AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
          LEFT JOIN leave_balance_logs lbl ON p.id = lbl.personnel_id
              AND lbl.leave_type_id = $1
              AND lbl.created_at > (CURRENT_TIMESTAMP - interval '1 hour')
          WHERE pd.department_id = $2
          ORDER BY lbl.created_at DESC
      `, [leave_type_id, department_id]);

      res.json(result.rows);
  } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ 
          error: 'Bakiye kontrolü yapılırken hata oluştu', 
          details: error.message 
      });
  }
});

// Güncelleme sonuçlarını kontrol etme endpoint'i
router.get('/verify-balance-update', async (req, res) => {
  try {
      const { department_id, leave_type_id, selected_personnel } = req.query;
      console.log('Kontrol parametreleri:', { department_id, leave_type_id, selected_personnel });

      let query = `
          SELECT 
              p.id,
              CONCAT(p.first_name, ' ', p.last_name) as full_name,
              lb.total_days,
              lb.used_days,
              lb.last_calculated_at,
              lbl.action_type as last_action,
              lbl.days_changed,
              lbl.reason,
              lbl.created_at as log_created_at
          FROM personnel p
          INNER JOIN personnel_departments pd ON p.id = pd.personnel_id
          LEFT JOIN leave_balances lb ON p.id = lb.personnel_id 
              AND lb.leave_type_id = $1
              AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
          LEFT JOIN (
              SELECT DISTINCT ON (personnel_id) *
              FROM leave_balance_logs
              WHERE leave_type_id = $1
              AND created_at > (CURRENT_TIMESTAMP - interval '24 hours')
              ORDER BY personnel_id, created_at DESC
          ) lbl ON p.id = lbl.personnel_id
          WHERE pd.department_id = $2 AND p.is_active = true
      `;

      const params = [leave_type_id, department_id];

      if (selected_personnel) {
          const personnelIds = Array.isArray(selected_personnel) 
              ? selected_personnel 
              : selected_personnel.split(',').map(Number);
          
          query += ` AND p.id = ANY($3)`;
          params.push(personnelIds);
      }

      query += ` ORDER BY lbl.created_at DESC NULLS LAST`;

      console.log('Kontrol sorgusu:', query);
      console.log('Sorgu parametreleri:', params);

      const result = await pool.query(query, params);
      console.log('Kontrol sonuçları:', result.rows);

      res.json(result.rows);
  } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ 
          error: 'Bakiye kontrolü yapılırken hata oluştu', 
          details: error.message 
      });
  }
});

module.exports = router;