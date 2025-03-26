// routes/expenseTemplates.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');


// Tüm şablonları getir
router.get('/templates', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`
        WITH template_items AS (
          SELECT 
            template_id,
            json_agg(
              json_build_object(
                'id', id,
                'description', description,
                'amount', amount,
                'sort_order', sort_order
              ) ORDER BY sort_order
            ) as items
          FROM expense_template_items
          GROUP BY template_id
        )
        SELECT 
          t.*,
          c.name as category_name,
          COALESCE(ti.items, '[]'::json) as items
        FROM expense_templates t
        LEFT JOIN expense_categories c ON t.category_id = c.id
        LEFT JOIN template_items ti ON t.id = ti.template_id
        WHERE t.is_active = true
        ORDER BY t.created_at DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Şablon listesi hatası:', error);
      res.status(500).json({ error: 'Veritabanı hatası' });
    }
  });

  
// Yeni şablon oluştur
// Şablon oluşturma
router.post('/templates', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const { name, category_id, items } = req.body;
      
      const templateResult = await client.query(`
        INSERT INTO expense_templates (
          name, 
          category_id, 
          total_amount, 
          created_by
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        name,
        category_id,
        items.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        req.user.personnelId
      ]);
  
      const templateId = templateResult.rows[0].id;
  
      // Alt kalemleri ekle
      for (let i = 0; i < items.length; i++) {
        await client.query(`
          INSERT INTO expense_template_items (
            template_id, 
            description, 
            amount, 
            sort_order
          ) VALUES ($1, $2, $3, $4)
        `, [templateId, items[i].description, items[i].amount, i]);
      }
  
      await client.query('COMMIT');
  
      // Tam veriyi getir
      const result = await client.query(`
        SELECT 
          t.*,
          c.name as category_name,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'id', ti.id,
                'description', ti.description,
                'amount', ti.amount,
                'sort_order', ti.sort_order
              ) ORDER BY ti.sort_order)
              FROM expense_template_items ti 
              WHERE ti.template_id = t.id
            ),
            '[]'::json
          ) as items
        FROM expense_templates t
        LEFT JOIN expense_categories c ON t.category_id = c.id
        WHERE t.id = $1
      `, [templateId]);
  
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Şablon oluşturma hatası:', error);
      res.status(500).json({ error: 'İşlem başarısız' });
    } finally {
      client.release();
    }
  });

// Şablon güncelle
router.put('/templates/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { name, category_id, items } = req.body;

    // Şablonu güncelle
    await client.query(`
      UPDATE expense_templates 
      SET name = $1,
          category_id = $2,
          total_amount = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [
      name,
      category_id,
      items.reduce((sum, item) => sum + parseFloat(item.amount), 0),
      id
    ]);

    // Mevcut alt kalemleri sil
    await client.query('DELETE FROM expense_template_items WHERE template_id = $1', [id]);

    // Yeni alt kalemleri ekle
    for (let i = 0; i < items.length; i++) {
      await client.query(`
        INSERT INTO expense_template_items (
          template_id, description, amount, sort_order
        ) VALUES ($1, $2, $3, $4)
      `, [id, items[i].description, items[i].amount, i]);
    }

    await client.query('COMMIT');

    // Güncellenmiş veriyi getir
    const result = await client.query(`
      SELECT t.*,
             c.name as category_name,
             (
               SELECT json_agg(ti.*)
               FROM expense_template_items ti
               WHERE ti.template_id = t.id
               ORDER BY ti.sort_order
             ) as items
      FROM expense_templates t
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE t.id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Şablon güncelleme hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  } finally {
    client.release();
  }
});

// Şablon sil
router.delete('/templates/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Önce alt kalemleri sil
    await client.query('DELETE FROM expense_template_items WHERE template_id = $1', [req.params.id]);
    
    // Sonra şablonu pasife çek
    await client.query(`
      UPDATE expense_templates 
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [req.params.id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Şablon silme hatası:', error);
    res.status(500).json({ error: 'İşlem başarısız' });
  } finally {
    client.release();
  }
});

module.exports = router;