// routes/leaveManagement.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware'); // Import düzeltildi

// İzin Türleri (Leave Types) - Listeleme
router.get('/new-leave-types', authMiddleware, async (req, res) => {  // authMiddleware eklendi
  try {
    const query = `
      SELECT lt.*, 
             cm.name as calculation_method_name,
             rp.name as renewal_period_name
      FROM new_leave_types lt
      LEFT JOIN new_leave_calculation_methods cm ON lt.calculation_method_id = cm.id
      LEFT JOIN new_leave_renewal_periods rp ON lt.renewal_period_id = rp.id
      WHERE lt.is_active = true
      ORDER BY lt.created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// İzin Türü Ekleme
router.post('/new-leave-types', authMiddleware, async (req, res) => {  // authMiddleware eklendi
  try {
    const {
      code,
      name,
      calculation_method_id,
      renewal_period_id,
      is_paid,
      is_event_based,
      requires_approval,
      max_days,
      description
    } = req.body;

    const query = `
      INSERT INTO new_leave_types (
        code, name, calculation_method_id, renewal_period_id,
        is_paid, is_event_based, requires_approval, max_days,
        description, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      code,
      name,
      calculation_method_id,
      renewal_period_id,
      is_paid,
      is_event_based,
      requires_approval,
      max_days,
      description
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// leaveManagement.js içine eklenecek

// Belirli bir izin türünün detaylarını ve koşullarını getir
router.get('/new-leave-types/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // İzin türünü ve ilişkili tüm koşullarını getir
    const query = `
      SELECT 
        lt.*,
        cm.name as calculation_method_name,
        rp.name as renewal_period_name,
        json_agg(
          json_build_object(
            'condition_id', ltc.id,
            'condition_type_code', lct.code,
            'condition_type_name', lct.name,
            'table_name', lct.table_name,
            'column_name', lct.column_name,
            'data_type', lct.data_type,
            'operator_code', co.code,
            'operator_symbol', co.symbol,
            'required_value', ltc.required_value,
            'error_message', ltc.error_message
          )
        ) FILTER (WHERE ltc.id IS NOT NULL) as conditions
      FROM new_leave_types lt
      LEFT JOIN new_leave_calculation_methods cm ON lt.calculation_method_id = cm.id
      LEFT JOIN new_leave_renewal_periods rp ON lt.renewal_period_id = rp.id
      LEFT JOIN new_leave_type_conditions ltc ON lt.id = ltc.leave_type_id AND ltc.is_active = true
      LEFT JOIN new_leave_condition_types lct ON ltc.condition_type_id = lct.id
      LEFT JOIN new_comparison_operators co ON ltc.comparison_operator_id = co.id
      WHERE lt.id = $1 AND lt.is_active = true
      GROUP BY lt.id, cm.name, rp.name
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'İzin türü bulunamadı' });
    }

    // conditions null ise boş array olarak ayarla
    const leaveType = result.rows[0];
    leaveType.conditions = leaveType.conditions || [];

    res.json(leaveType);
  } catch (error) {
    console.error('Error fetching leave type:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// İzin Türü Güncelleme
router.put('/new-leave-types/:id', authMiddleware, async (req, res) => {  // authMiddleware eklendi
  try {
    const { id } = req.params;
    const {
      code,
      name,
      calculation_method_id,
      renewal_period_id,
      is_paid,
      is_event_based,
      requires_approval,
      max_days,
      description
    } = req.body;

    const query = `
      UPDATE new_leave_types 
      SET code = $1,
          name = $2,
          calculation_method_id = $3,
          renewal_period_id = $4,
          is_paid = $5,
          is_event_based = $6,
          requires_approval = $7,
          max_days = $8,
          description = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND is_active = true
      RETURNING *
    `;

    const values = [
      code,
      name,
      calculation_method_id,
      renewal_period_id,
      is_paid,
      is_event_based,
      requires_approval,
      max_days,
      description,
      id
    ];

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// İzin Türü Silme
router.delete('/new-leave-types/:id', authMiddleware, async (req, res) => {  // authMiddleware eklendi
  try {
    const { id } = req.params;
    const query = `
      UPDATE new_leave_types 
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await db.query(query, [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hesaplama Methodları Listeleme
router.get('/new-leave-calculation-methods', authMiddleware, async (req, res) => {  // authMiddleware eklendi
  try {
    const query = `
      SELECT * FROM new_leave_calculation_methods 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yenileme Periyotları Listeleme
router.get('/renewal-periods', authMiddleware, async (req, res) => {
    try {
      const query = `
        SELECT * FROM new_leave_renewal_periods 
        WHERE is_active = true 
        ORDER BY renewal_month, renewal_day
      `;
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Yeni Yenileme Periyodu Ekleme
// Yeni Yenileme Periyodu Ekleme
router.post('/renewal-periods', authMiddleware, async (req, res) => {
    try {
      const { code, name, renewal_type, renewal_month, renewal_day, description } = req.body;
  
      const query = `
        INSERT INTO new_leave_renewal_periods (
          code, name, renewal_type, renewal_month, renewal_day, description, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const values = [code, name, renewal_type, renewal_month, renewal_day, description];
      const result = await db.query(query, values);
  
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding renewal period:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  
  
  
  // Yenileme Periyodu Güncelleme
  router.put('/renewal-periods/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, renewal_month, renewal_day, description } = req.body;
  
      const query = `
        UPDATE new_leave_renewal_periods 
        SET name = $1,
            renewal_month = $2,
            renewal_day = $3,
            description = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND is_active = true
        RETURNING *
      `;
      const values = [name, renewal_month, renewal_day, description, id];
      const result = await db.query(query, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Renewal period not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// Karşılaştırma Operatörleri Listeleme
router.get('/new-comparison-operators', authMiddleware, async (req, res) => {  // authMiddleware eklendi
  try {
    const query = `
      SELECT * FROM new_comparison_operators 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yeni Karşılaştırma Operatörü Ekleme
router.post('/new-comparison-operators', authMiddleware, async (req, res) => {
    try {
      const { code, name, symbol, description } = req.body;
  
      const query = `
        INSERT INTO new_comparison_operators (code, name, symbol, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
  
      const values = [code, name, symbol, description];
      const result = await db.query(query, values);
  
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


// İzin koşul Endpoint'leri
router.get('/new-leave-condition-types', authMiddleware, async (req, res) => {
    try {
      const query = `
        SELECT * FROM new_leave_condition_types 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `;
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  // Yeni Koşul Türü Ekleme
  router.post('/new-leave-condition-types', authMiddleware, async (req, res) => {
    try {
      const { code, name, table_name, column_name, data_type, possible_values, description } = req.body;
  
      const query = `
        INSERT INTO new_leave_condition_types (
          code, name, table_name, column_name, data_type, possible_values, description, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
  
      // possible_values alanı boş ise NULL olarak ayarla
      const values = [
        code,
        name,
        table_name,
        column_name,
        data_type,
        possible_values || null,  // Eğer possible_values boşsa null kullan
        description
      ];
  
      const result = await db.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Hata Oluştu:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  
  
  


  router.get('/new-leave-type-conditions', authMiddleware, async (req, res) => {
    try {
      const query = `
        SELECT ltc.*,
               lt.name as leave_type_name,
               ct.name as condition_type_name,
               co.name as operator_name
        FROM new_leave_type_conditions ltc
        JOIN new_leave_types lt ON ltc.leave_type_id = lt.id
        JOIN new_leave_condition_types ct ON ltc.condition_type_id = ct.id
        JOIN new_comparison_operators co ON ltc.comparison_operator_id = co.id
        WHERE ltc.is_active = true
        ORDER BY lt.name, ct.name
      `;
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.get('/new-leave-type-conditions/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        SELECT ltc.*,
               lt.name as leave_type_name,
               ct.name as condition_type_name,
               co.name as operator_name
        FROM new_leave_type_conditions ltc
        JOIN new_leave_types lt ON ltc.leave_type_id = lt.id
        JOIN new_leave_condition_types ct ON ltc.condition_type_id = ct.id
        JOIN new_comparison_operators co ON ltc.comparison_operator_id = co.id
        WHERE ltc.id = $1 AND ltc.is_active = true
      `;
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Condition not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.post('/new-leave-type-conditions', authMiddleware, async (req, res) => {
    try {
      const {
        leave_type_id,
        condition_type_id,
        comparison_operator_id,
        required_value,
        error_message
      } = req.body;

      console.log('Received condition data:', req.body); // Debug için eklendi

          // Gelen verileri kontrol et
    if (!comparison_operator_id) {
      return res.status(400).json({ error: 'Comparison operator is required' });
    }

      const query = `
        INSERT INTO new_leave_type_conditions (
          leave_type_id, condition_type_id, comparison_operator_id,
          required_value, error_message, is_active,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
  
      const values = [
        leave_type_id,
        condition_type_id,
        comparison_operator_id,
        required_value,
        error_message
      ];


      console.log('Query values:', values); // Debug için eklendi
  
      const result = await db.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {

      console.error('Database error:', error); // Debug için eklendi
      res.status(500).json({ error: error.message });
    }
  });
  
  // İzin Politikaları Endpoint'leri
  router.get('/leave-policies', authMiddleware, async (req, res) => {
    try {
      const query = `
        SELECT lp.*,
               lt.name as leave_type_name
        FROM leave_policies lp
        JOIN new_leave_types lt ON lp.leave_type_id = lt.id
        ORDER BY lt.name, lp.years_of_service
      `;
      const result = await db.query(query);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.post('/leave-policies', authMiddleware, async (req, res) => {
    try {
      const {
        leave_type_id,
        years_of_service,
        days_entitled,
        is_carried_forward,
        max_carryover_days,
        effective_from,
        effective_to,
      } = req.body;
  
      console.log('Received values:', req.body); // Gelen veriyi kontrol edin
  
      const query = `
        INSERT INTO leave_policies (
          leave_type_id,
          years_of_service,
          days_entitled,
          is_carried_forward,
          max_carryover_days,
          effective_from,
          effective_to,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *
      `;
  
      const values = [
        leave_type_id,
        years_of_service,
        days_entitled,
        is_carried_forward,
        max_carryover_days || null,
        effective_from,
        effective_to,
      ];
  
      const result = await db.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding leave policy:', error); // Hata logu
      res.status(500).json({ error: error.message });
    }
  });
    

  // Get all system tables
router.get('/system-tables', authMiddleware, async (req, res) => {
    try {
      const result = await db.query(`SELECT * FROM system_tables WHERE is_active = TRUE ORDER BY table_name`);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get columns by table ID
  router.get('/system-columns/:tableId', authMiddleware, async (req, res) => {
    try {
      const { tableId } = req.params;
      const result = await db.query(`SELECT * FROM system_columns WHERE table_id = $1 AND is_active = TRUE`, [tableId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  


module.exports = router;