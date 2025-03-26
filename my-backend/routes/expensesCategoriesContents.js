// routes/expensesCategoriesContents.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');

// CONTENT TYPES ROUTES
// -------------------

// Tüm content type'ları getir
router.get('/content-types', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM expense_content_types 
      WHERE is_active = true 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Content type listesi hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// Yeni content type ekle
router.post('/content-types', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, file_extensions, max_file_size } = req.body;
    
    const result = await client.query(`
      INSERT INTO expense_content_types (
        name, description, file_extensions, max_file_size
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, file_extensions, max_file_size]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Content type ekleme hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  } finally {
    client.release();
  }
});

// Content type güncelle
router.put('/content-types/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, description, file_extensions, max_file_size, is_active } = req.body;
    
    const result = await client.query(`
      UPDATE expense_content_types 
      SET name = $1,
          description = $2,
          file_extensions = $3,
          max_file_size = $4,
          is_active = $5
      WHERE id = $6
      RETURNING *
    `, [name, description, file_extensions, max_file_size, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content type bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Content type güncelleme hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  } finally {
    client.release();
  }
});

// Dosya validasyonu
router.get('/content-types/:id/validate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, filesize } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM expense_content_types WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content type bulunamadı' });
    }
    
    const contentType = result.rows[0];
    const fileExt = '.' + filename.split('.').pop().toLowerCase();
    
    const isValid = {
      extension: contentType.file_extensions.includes(fileExt),
      size: filesize <= contentType.max_file_size,
      active: contentType.is_active
    };
    
    res.json({
      isValid,
      errors: {
        extension: !isValid.extension ? 'Desteklenmeyen dosya formatı' : null,
        size: !isValid.size ? 'Dosya boyutu çok büyük' : null,
        active: !isValid.active ? 'Bu belge tipi artık aktif değil' : null
      }
    });
  } catch (error) {
    console.error('Validasyon hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

// CATEGORIES ROUTES
// ----------------

// Tüm kategorileri getir (hiyerarşik yapıda)
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH RECURSIVE category_tree AS (
        -- Ana kategoriler
        SELECT 
          id, name, description, code, parent_id, 
          budget_limit, is_active,
          ARRAY[id] as path,
          1 as level
        FROM expense_categories
        WHERE parent_id IS NULL
        
        UNION ALL
        
        -- Alt kategoriler
        SELECT 
          e.id, e.name, e.description, e.code, e.parent_id, 
          e.budget_limit, e.is_active,
          ct.path || e.id,
          ct.level + 1
        FROM expense_categories e
        INNER JOIN category_tree ct ON ct.id = e.parent_id
      )
      SELECT 
        ct.*,
        p.name as parent_name,
        COALESCE(
          (SELECT SUM(amount) 
           FROM expenses 
           WHERE category_id = ct.id 
           AND created_at >= date_trunc('month', CURRENT_DATE)
          ), 0
        ) as monthly_spent
      FROM category_tree ct
      LEFT JOIN expense_categories p ON ct.parent_id = p.id
      WHERE ct.is_active = true
      ORDER BY ct.path;
    `);

    // Hiyerarşik yapıya dönüştür
    const categories = [];
    const lookup = {};
    
    result.rows.forEach(row => {
      const category = {
        ...row,
        children: []
      };
      
      lookup[row.id] = category;
      
      if (row.parent_id === null) {
        categories.push(category);
      } else {
        lookup[row.parent_id].children.push(category);
      }
    });

    res.json(categories);
  } catch (error) {
    console.error('Kategori listesi hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// Yeni kategori ekle
router.post('/categories', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, code, parent_id, budget_limit } = req.body;
    
    // Kod benzersizliğini kontrol et
    const codeCheck = await client.query(
      'SELECT id FROM expense_categories WHERE code = $1',
      [code]
    );
    
    if (codeCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Bu kategori kodu zaten kullanılıyor' 
      });
    }
    
    const result = await client.query(`
      INSERT INTO expense_categories (
        name, description, code, parent_id, budget_limit
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, code, parent_id, budget_limit]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Kategori ekleme hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  } finally {
    client.release();
  }
});

// Kategori güncelle
router.put('/categories/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, description, code, parent_id, budget_limit, is_active } = req.body;
    
    // Kod benzersizliğini kontrol et
    const codeCheck = await client.query(
      'SELECT id FROM expense_categories WHERE code = $1 AND id != $2',
      [code, id]
    );
    
    if (codeCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Bu kategori kodu zaten kullanılıyor' 
      });
    }
    
    // Döngüsel parent kontrolü
    if (parent_id) {
      const cycleCheck = await client.query(`
        WITH RECURSIVE category_parents AS (
          SELECT id, parent_id FROM expense_categories WHERE id = $1
          UNION
          SELECT c.id, c.parent_id
          FROM expense_categories c
          INNER JOIN category_parents cp ON c.id = cp.parent_id
        )
        SELECT id FROM category_parents WHERE id = $2
      `, [parent_id, id]);
      
      if (cycleCheck.rows.length > 0) {
        return res.status(400).json({ 
          error: 'Döngüsel kategori ilişkisi oluşturulamaz' 
        });
      }
    }
    
    const result = await client.query(`
      UPDATE expense_categories 
      SET name = $1,
          description = $2,
          code = $3,
          parent_id = $4,
          budget_limit = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, description, code, parent_id, budget_limit, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Kategori güncelleme hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  } finally {
    client.release();
  }
});

// Kategori istatistikleri
router.get('/categories/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    const result = await pool.query(`
      SELECT 
        c.name as category_name,
        COUNT(e.id) as expense_count,
        SUM(e.amount) as total_amount,
        AVG(e.amount) as avg_amount,
        MIN(e.amount) as min_amount,
        MAX(e.amount) as max_amount,
        c.budget_limit,
        CASE 
          WHEN c.budget_limit IS NOT NULL 
          THEN (SUM(e.amount) / c.budget_limit * 100)
          ELSE NULL 
        END as budget_usage_percent
      FROM expense_categories c
      LEFT JOIN expenses e ON c.id = e.category_id
      WHERE c.id = $1
      AND ($2::date IS NULL OR e.created_at >= $2::date)
      AND ($3::date IS NULL OR e.created_at <= $3::date)
      GROUP BY c.id, c.name, c.budget_limit
    `, [id, start_date, end_date]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Kategori istatistik hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

module.exports = router;