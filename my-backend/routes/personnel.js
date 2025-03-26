const express = require('express');
const pool = require('../config/db');
const router = express.Router();
const LeaveAllocationService = require('../services/leaveAllocationService');

const authMiddleware = require('../middleware/authMiddleware');

// Korunan route
router.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({ message: 'Bu korunan bir sayfadır' });
});


// GET: Tüm personel verilerini getir
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
SELECT 
    p.id, 
    p.first_name, 
    p.last_name, 
    p.gender, 
    p.tc_id_number, 
    d.id AS department_id,         -- Departman ID'sini ekledik
    d.name AS department, 
    t.name AS title,
    ph.blood_type AS blood_type,   -- Sağlık durumu (kan grubu)
    pp.photo_url,                  -- Fotoğraf URL'si
    pf.marital_status AS marital_status  -- Evlilik durumu
FROM 
    personnel p
LEFT JOIN 
    personnel_departments pd ON p.id = pd.personnel_id
LEFT JOIN 
    departments d ON pd.department_id = d.id
LEFT JOIN 
    personnel_titles pt ON p.id = pt.personnel_id
LEFT JOIN 
    titles t ON pt.title_id = t.id
LEFT JOIN 
    personnel_photos pp ON p.id = pp.personnel_id
LEFT JOIN 
    personnel_health ph ON p.id = ph.personnel_id
LEFT JOIN 
    personnel_family pf ON p.id = pf.personnel_id;

    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No personnel found' });
    }
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching personnel data:', err);
    res.status(500).json({ error: 'Failed to fetch personnel data' });
  }
});

// GET: Belirli bir personelin bilgilerini getir (Personel + fotoğraf + departman + title)
router.get('/:id', async (req, res) => {
  const personnelId = req.params.id;
  try {
    const personnelResult = await pool.query(
      'SELECT p.*, d.name as department, t.name as title FROM personnel p ' +
      'LEFT JOIN personnel_departments pd ON p.id = pd.personnel_id ' +
      'LEFT JOIN departments d ON pd.department_id = d.id ' +
      'LEFT JOIN personnel_titles pt ON p.id = pt.personnel_id ' +
      'LEFT JOIN titles t ON pt.title_id = t.id ' +
      'WHERE p.id = $1',
      [personnelId]
    );

    if (personnelResult.rows.length === 0) {
      return res.status(404).json({ message: 'Personnel not found' });
    }

    const personnel = personnelResult.rows[0];

    const photoResult = await pool.query(
      'SELECT photo_url FROM personnel_photos WHERE personnel_id = $1',
      [personnelId]
    );

    if (photoResult.rows.length > 0) {
      personnel.photo_url = photoResult.rows[0].photo_url;
    } else {
      personnel.photo_url = null;
    }

    res.status(200).json(personnel);
  } catch (err) {
    console.error('Error fetching personnel details:', err);
    res.status(500).json({ error: 'Failed to fetch personnel details' });
  }
});



/// Yaklaşan doğum günlerini getiren route
// personnel.js içinde /birthdays/upcoming rotası
router.get('/birthdays/upcoming', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, first_name, last_name, birthdate
      FROM personnel
      WHERE birthdate IS NOT NULL
        AND (
          (EXTRACT(MONTH FROM birthdate) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(DAY FROM birthdate) >= EXTRACT(DAY FROM CURRENT_DATE))
          OR
          (EXTRACT(MONTH FROM birthdate) = EXTRACT(MONTH FROM (CURRENT_DATE + INTERVAL '10 days'))
           AND EXTRACT(DAY FROM birthdate) <= EXTRACT(DAY FROM (CURRENT_DATE + INTERVAL '10 days')))
        )
    `);

    // Eğer veri yoksa, boş bir liste döndür
    if (result.rows.length === 0) {
      return res.status(200).json([]);  // Boş liste döndür
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching upcoming birthdays:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
  }
});




// GET: Bir personelin detaylı bilgilerini getir (health, address, education, contact, family)
router.get('/:id/details', async (req, res) => {
  const personnelId = req.params.id;

  try {
    // Personnel tablosundan gender ve birthdate alanlarını alıyoruz
    const personnelInfo = (await pool.query('SELECT gender, birthdate FROM personnel WHERE id = $1', [personnelId])).rows[0];

    // Tüm ilgili tablolardan veriyi çekiyoruz
    const personnelDetails = {
      address: (await pool.query('SELECT * FROM personnel_address WHERE personnel_id = $1', [personnelId])).rows[0],
      contact: (await pool.query('SELECT * FROM personnel_contact WHERE personnel_id = $1', [personnelId])).rows[0],
      health: (await pool.query('SELECT * FROM personnel_health WHERE personnel_id = $1', [personnelId])).rows[0],
      education: (await pool.query('SELECT * FROM personnel_education WHERE personnel_id = $1', [personnelId])).rows[0],
      family: (await pool.query('SELECT * FROM personnel_family WHERE personnel_id = $1', [personnelId])).rows[0],
      gender: personnelInfo.gender,
      birthdate: personnelInfo.birthdate
    };

    res.json(personnelDetails);
  } catch (error) {
    console.error('Error fetching personnel details:', error);
    res.status(500).send('Server error');
  }
});



// PUT: Personnel bilgilerini güncelle (gender, birthdate gibi)
router.put('/:personnelId/personal-info', async (req, res) => {
  const personnelId = req.params.personnelId;
  const { gender, birthdate } = req.body;

  try {
    const result = await pool.query(
      'UPDATE personnel SET gender = $1, birthdate = $2 WHERE id = $3 RETURNING *',
      [gender, birthdate, personnelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Personnel not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating personal information:', err);
    res.status(500).json({ error: 'Failed to update personal information' });
  }
});




// POST: Yeni bir personel ekle
// Ana personel ekleme route'u
// POST: Yeni bir personel ekle
router.post('/', async (req, res) => {
  const { first_name, last_name, tc_id_number, hire_date, department_id, title_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ana personel kaydı
    const personnelResult = await client.query(
      'INSERT INTO personnel (first_name, last_name, tc_id_number) VALUES ($1, $2, $3) RETURNING *',
      [first_name, last_name, tc_id_number]
    );

    const newPersonnel = personnelResult.rows[0];

    // İşe giriş kaydı
    if (hire_date) {
      await client.query(
        'INSERT INTO hire_termination_history (personnel_id, hire_date) VALUES ($1, $2)',
        [newPersonnel.id, hire_date]
      );
    }

    // Departman ataması (opsiyonel)
    if (department_id) {
      await client.query(
        'INSERT INTO personnel_departments (personnel_id, department_id) VALUES ($1, $2)',
        [newPersonnel.id, department_id]
      );
    }

    // Title ataması (opsiyonel)
    if (title_id) {
      await client.query(
        'INSERT INTO personnel_titles (personnel_id, title_id) VALUES ($1, $2)',
        [newPersonnel.id, title_id]
      );
    }

    // Employment history kaydı (sadece hire_date varsa ve department_id veya title_id varsa)
    if (hire_date && (department_id || title_id)) {
      const employmentQuery = `
        INSERT INTO employment_history 
        (personnel_id, department_id, title_id, hire_date)
        VALUES ($1, $2, $3, $4)
      `;
      await client.query(employmentQuery, [
        newPersonnel.id,
        department_id || null,
        title_id || null,
        hire_date
      ]);
    }

    // İzin hakları hesaplama ve tanımlama
    const leaveTypes = await client.query('SELECT id FROM leave_types');
    
    for (const leaveType of leaveTypes.rows) {
      const policyResult = await client.query(`
        SELECT days_entitled 
        FROM leave_policies 
        WHERE leave_type_id = $1 
        AND years_of_service = 0
        ORDER BY years_of_service DESC 
        LIMIT 1
      `, [leaveType.id]);

      if (policyResult.rows.length > 0) {
        const totalDays = policyResult.rows[0].days_entitled;
        const currentYear = new Date().getFullYear();
        
        await client.query(`
          INSERT INTO leave_balances 
          (personnel_id, leave_type_id, year, total_days, used_days)
          VALUES ($1, $2, $3, $4, 0)
        `, [newPersonnel.id, leaveType.id, currentYear, totalDays]);
      }
    }

    await client.query('COMMIT');

    // Son eklenen personelin tüm bilgilerini getir
    const finalResult = await client.query(`
      SELECT 
        p.*,
        d.name as department_name,
        t.name as title_name,
        pd.department_id,
        pt.title_id,
        ph.photo_url,
        hth.hire_date
      FROM personnel p
      LEFT JOIN personnel_departments pd ON p.id = pd.personnel_id
      LEFT JOIN departments d ON pd.department_id = d.id
      LEFT JOIN personnel_titles pt ON p.id = pt.personnel_id
      LEFT JOIN titles t ON pt.title_id = t.id
      LEFT JOIN personnel_photos ph ON p.id = ph.personnel_id
      LEFT JOIN hire_termination_history hth ON p.id = hth.personnel_id
      WHERE p.id = $1
      ORDER BY hth.hire_date DESC
      LIMIT 1
    `, [newPersonnel.id]);

    // Yanıt hazırlama
    const response = {
      id: finalResult.rows[0].id,
      first_name: finalResult.rows[0].first_name,
      last_name: finalResult.rows[0].last_name,
      tc_id_number: finalResult.rows[0].tc_id_number,
      hire_date: finalResult.rows[0].hire_date,
      department: finalResult.rows[0]?.department_name || null,
      title: finalResult.rows[0]?.title_name || null,
      department_id: finalResult.rows[0]?.department_id || null,
      title_id: finalResult.rows[0]?.title_id || null,
      photo_url: finalResult.rows[0]?.photo_url || null
    };

    res.status(201).json(response);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during personnel creation:', err);
    res.status(500).json({ 
      error: 'Failed to add personnel', 
      details: err.message 
    });
  } finally {
    client.release();
  }
});

// Departman güncelleme route'u
router.post('/:id/department', async (req, res) => {
  const personnelId = req.params.id;
  const { department_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Personnel departments tablosunu güncelle
    await client.query(
      'INSERT INTO personnel_departments (personnel_id, department_id) VALUES ($1, $2) ' +
      'ON CONFLICT (personnel_id) DO UPDATE SET department_id = EXCLUDED.department_id',
      [personnelId, department_id]
    );

    // Employment history'ye yeni kayıt ekle
    await client.query(
      'INSERT INTO employment_history (personnel_id, department_id, hire_date) VALUES ($1, $2, NOW())',
      [personnelId, department_id]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: 'Department updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating department:', err);
    res.status(500).json({ error: 'Failed to update department' });
  } finally {
    client.release();
  }
});

// Title güncelleme route'u
router.post('/:id/title', async (req, res) => {
  const personnelId = req.params.id;
  const { title_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Personnel titles tablosunu güncelle
    await client.query(
      'INSERT INTO personnel_titles (personnel_id, title_id) VALUES ($1, $2) ' +
      'ON CONFLICT (personnel_id) DO UPDATE SET title_id = EXCLUDED.title_id',
      [personnelId, title_id]
    );

    // Employment history'ye yeni kayıt ekle
    await client.query(
      'INSERT INTO employment_history (personnel_id, title_id, hire_date) VALUES ($1, $2, NOW())',
      [personnelId, title_id]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: 'Title updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating title:', err);
    res.status(500).json({ error: 'Failed to update title' });
  } finally {
    client.release();
  }
});

// Özel olarak tutanak için personel detaylarını getir
// routes/personnel.js içindeki minutes-detail endpoint'ini güncelleyelim

// Mevcut endpoint'leri koruyarak, yeni endpoint'i ekleyelim
router.get('/:id/minutes-detail', authMiddleware, async (req, res) => {
  const personnelId = req.params.id;
  try {
      // Debug için
      console.log('Requesting personnel details for ID:', personnelId);

      const result = await pool.query(`
          SELECT 
              p.id,
              p.first_name,
              p.last_name,
              d.name as department,
              t.name as title,
              CONCAT(p.first_name, ' ', p.last_name) as full_name
          FROM personnel p
          LEFT JOIN personnel_departments pd ON p.id = pd.personnel_id
          LEFT JOIN departments d ON pd.department_id = d.id
          LEFT JOIN personnel_titles pt ON p.id = pt.personnel_id
          LEFT JOIN titles t ON pt.title_id = t.id
          WHERE p.id = $1
      `, [personnelId]);

      console.log('Query result:', result.rows); // Debug için

      if (result.rows.length === 0) {
          console.log('No personnel found for ID:', personnelId); // Debug için
          return res.status(404).json({
              error: 'Personnel not found',
              message: `ID: ${personnelId} olan personel bulunamadı`
          });
      }

      res.json(result.rows[0]);
  } catch (err) {
      console.error('Error in minutes-detail endpoint:', err);
      res.status(500).json({
          error: 'Server error',
          message: 'Personel bilgileri alınırken bir hata oluştu',
          details: err.message
      });
  }
});



// Birden fazla personelin detaylarını aynı anda getir (toplu sorgu için)
router.post('/batch', async (req, res) => {
  try {
      const { ids } = req.body; // personel ID'lerinin array'i

      if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: 'Invalid personnel IDs' });
      }

      const result = await pool.query(`
          SELECT 
              p.id,
              p.first_name,
              p.last_name,
              t.name as title,
              d.name as department,
              CONCAT(p.first_name, ' ', p.last_name) as full_name
          FROM personnel p
          LEFT JOIN personnel_titles pt ON p.id = pt.personnel_id
          LEFT JOIN titles t ON pt.title_id = t.id
          LEFT JOIN personnel_departments pd ON p.id = pd.personnel_id
          LEFT JOIN departments d ON pd.department_id = d.id
          WHERE p.id = ANY($1)
      `, [ids]);

      res.json(result.rows);
  } catch (err) {
      console.error('Error fetching batch personnel:', err);
      res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
