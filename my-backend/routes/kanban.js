// Kanban.js Backend Revizyon

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Dosya yükleme konfigürasyonu
const storage = multer.diskStorage({
  destination: './uploads/kanban',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});


// Arşiv dosyaları için storage config
const archiveStorage = multer.diskStorage({
  destination: './uploads/archives',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const archiveUpload = multer({ 
  storage: archiveStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip') {
      cb(null, true);
    } else {
      cb(new Error('Sadece ZIP dosyaları yüklenebilir'), false);
    }
  }
});

// Listing dosyaları için storage config
const listingStorage = multer.diskStorage({
  destination: './uploads/listings',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const listingUpload = multer({ 
  storage: listingStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip') {
      cb(null, true);
    } else {
      cb(new Error('Sadece ZIP dosyaları yüklenebilir'), false);
    }
  }
});


const upload = multer({ storage });

// Tüm rotaları authenticateToken middleware'i ile koruyun
router.use(authenticateToken);



// Dosya yükleme rotası
router.post('/cards/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi.' });
    }

    const { rows } = await pool.query(
      'INSERT INTO kanban_attachments (card_id, file_name, file_path, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, req.file.originalname, req.file.path, req.user.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/cards/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT a.*, u.username as uploaded_by_name FROM kanban_attachments a JOIN users u ON a.uploaded_by = u.id WHERE a.card_id = $1 ORDER BY a.id DESC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: error.message });
  }
});


// Etiketleri getir rotası
// routes/kanban.js içinde
router.get('/labels', async (req, res) => { // authenticateToken kaldırıldı çünkü zaten router.use(authenticateToken) var
  try {
    const { rows } = await pool.query('SELECT * FROM kanban_labels ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Tüm board verilerini getir
router.get('/', async (req, res) => {
    try {
        const lists = await pool.query(`
            SELECT l.*, 
                   COALESCE(json_agg(
                       CASE WHEN c.id IS NOT NULL THEN
                           json_build_object(
                               'id', c.id,
                               'content', c.content,
                               'description', c.description,
                               'position', c.position,
                               'assigned_to', c.assigned_to,
                               'due_date', c.due_date,
                               'created_by', c.created_by
                           )
                       ELSE NULL END
                   ) FILTER (WHERE c.id IS NOT NULL), '[]') as cards
            FROM kanban_lists l
            LEFT JOIN kanban_cards c ON l.id = c.list_id
            GROUP BY l.id
            ORDER BY l.position
        `);
        res.json(lists.rows);
    } catch (error) {
        console.error('Error fetching kanban data:', error);
        res.status(500).json({ error: 'Kanban board verileri alınırken bir hata oluştu' });
    }
});

// Liste oluştur
router.post('/lists', async (req, res) => {
    const { title } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO kanban_lists (title, position) VALUES ($1, (SELECT COALESCE(MAX(position) + 1, 0) FROM kanban_lists)) RETURNING *',
            [title]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating list:', error);
        res.status(500).json({ error: 'Liste oluşturulurken bir hata oluştu' });
    }
});

// Kart oluştur
router.post('/cards', async (req, res) => {
  const { list_id, content, description, assigned_to, due_date, priority, created_by } = req.body;

  console.log('Gelen veri:', req.body);

  try {
    const query = `
    INSERT INTO kanban_cards 
    (list_id, content, description, assigned_to, due_date, priority, position, created_by) 
    VALUES 
    ($1, $2, $3, $4, $5, $6, 
     (SELECT COALESCE(MAX(position) + 1, 0) FROM kanban_cards WHERE list_id = $1),
     $7)
    RETURNING *
  `;
  const values = [list_id, content, description, assigned_to, due_date, priority, created_by];
    const { rows } = await pool.query(query, values);
    console.log('Inserted card:', rows[0]);

    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Kart oluşturulurken hata oluştu.' });
  }
});
;



// Kart sil
router.delete('/cards/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM kanban_cards WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ error: 'Kart silinirken bir hata oluştu' });
    }
});

// Kart pozisyonunu güncelle
router.put('/cards/:id/position', async (req, res) => {
    const { id } = req.params;
    const { list_id, position } = req.body;
    try {
        await pool.query('BEGIN');
        
        await pool.query(
            `UPDATE kanban_cards 
             SET list_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [list_id, position, id]
        );
        
        await pool.query(
            `UPDATE kanban_cards
             SET position = position + 1
             WHERE list_id = $1 AND position >= $2 AND id != $3`,
            [list_id, position, id]
        );
        
        await pool.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating card position:', error);
        res.status(500).json({ error: 'Kart pozisyonu güncellenirken bir hata oluştu' });
    }
});


// Kart detaylarını getir
// Kart detaylarını getir
router.get('/cards/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*,
             COALESCE(json_agg(DISTINCT l.*) FILTER (WHERE l.id IS NOT NULL), '[]') as labels,
             COALESCE(json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]') as attachments,
             (SELECT COUNT(*) FROM kanban_card_archives WHERE card_id = c.id) as archives_count,
             (SELECT COUNT(*) FROM kanban_card_listings WHERE card_id = c.id) as listings_count
      FROM kanban_cards c
      LEFT JOIN kanban_card_labels cl ON c.id = cl.card_id
      LEFT JOIN kanban_labels l ON cl.label_id = l.id
      LEFT JOIN kanban_attachments a ON c.id = a.card_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [req.params.id]);
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// routes/kanban.js
router.put('/cards/:id', async (req, res) => {
  const { title, content, description, assigned_to, due_date, priority, archive_number, created_by, labels } = req.body;
  const { id } = req.params;
  
  try {
    await pool.query('BEGIN');

    // Kartı güncelle
    const { rows } = await pool.query(`
      UPDATE kanban_cards 
      SET content = $1,
          description = $2,
          assigned_to = $3,
          due_date = $4,
          priority = $5,
          archive_number = $6,
          created_by = $7
      WHERE id = $8 
      RETURNING *
    `, [content, description, assigned_to, due_date, priority, archive_number, created_by, id]);

    // Etiketleri güncelle
    if (labels) {
      // Önce eski etiketleri sil
      await pool.query('DELETE FROM kanban_card_labels WHERE card_id = $1', [id]);
      
      // Yeni etiketleri ekle
      if (labels.length > 0) {
        const labelValues = labels.map((_, i) => `($1, $${i + 2})`).join(',');
        await pool.query(
          `INSERT INTO kanban_card_labels (card_id, label_id) VALUES ${labelValues}`,
          [id, ...labels]
        );
      }
    }

    await pool.query('COMMIT');
    res.json(rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});


   // Dosya yükle
// Dosya yükleme için
router.post('/cards/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO kanban_attachments (card_id, file_name, file_path, uploaded_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, req.file.originalname, req.file.path, req.user.userId]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
   
// Yorumları getir
// routes/kanban.js
router.get('/cards/:id/comments', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, 
             u.username as user_name
      FROM kanban_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.card_id = $1
      ORDER BY c.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cards/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO kanban_comments (card_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.userId, req.body.comment]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/cards/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;  // cardId
    const { type, description } = req.body;  // body'den gelen "type"
    const userId = req.user.userId;
    
    const { rows } = await pool.query(
      `INSERT INTO kanban_activities (card_id, user_id, action_type, description)
VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, userId, type, description]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: error.message });
  }
});

   
   // Aktiviteleri getir
   router.get('/cards/:id/activities', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT 
          a.id,
          a.card_id,
          a.user_id,
          a.action_type AS type,  -- ALIAS
          a.description,
          a.created_at,
          u.username as user_name
        FROM kanban_activities a
        JOIN users u ON a.user_id = u.id
        WHERE a.card_id = $1
        ORDER BY a.created_at DESC
      `, [req.params.id]);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: error.message });
    }
  });
  

   router.post('/cards/:cardId/comments', authenticateToken, async (req, res) => {
    const { cardId } = req.params;
    const { comment } = req.body;
    const { userId } = req.user;
  
    try {
      const result = await pool.query(
        `INSERT INTO kanban_comments (card_id, user_id, comment) 
         VALUES ($1, $2, $3) RETURNING *`,
        [cardId, userId, comment]
      );
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  // routes/kanban.js
// routes/kanban.js içinde
router.delete('/lists/:id', async (req, res) => {
  const { id } = req.params;
  try {
    console.log('Başlangıç - Liste silme işlemi:', id);
    await pool.query('BEGIN');

    // Önce ilgili tüm template_id'leri alalım
    const templateIdsResult = await pool.query(
      'SELECT id FROM kanban_checklist_templates WHERE list_id = $1',
      [id]
    );
    const templateIds = templateIdsResult.rows.map(row => row.id);
    console.log('Silinecek template IDs:', templateIds);

    if (templateIds.length > 0) {
      // Önce bu template'leri kullanan tüm card checklist'lerini bulalım ve silelim
      console.log('Template kullanan card checklist\'leri siliniyor...');
      await pool.query(`
        DELETE FROM kanban_checklist_items
        WHERE checklist_id IN (
          SELECT id FROM kanban_card_checklists 
          WHERE template_id = ANY($1)
        )`,
        [templateIds]
      );

      // Şimdi card checklist'lerini silelim
      await pool.query(`
        DELETE FROM kanban_card_checklists 
        WHERE template_id = ANY($1)`,
        [templateIds]
      );

      // Template items'ları silelim
      await pool.query(`
        DELETE FROM kanban_checklist_template_items 
        WHERE template_id = ANY($1)`,
        [templateIds]
      );

      // Son olarak template'leri silelim
      await pool.query(`
        DELETE FROM kanban_checklist_templates 
        WHERE id = ANY($1)`,
        [templateIds]
      );
    }

    // Karttaki diğer checklist'leri temizle
    await pool.query(`
      DELETE FROM kanban_checklist_items 
      WHERE checklist_id IN (
        SELECT ccl.id 
        FROM kanban_card_checklists ccl
        JOIN kanban_cards c ON ccl.card_id = c.id 
        WHERE c.list_id = $1
      )`,
      [id]
    );

    await pool.query(`
      DELETE FROM kanban_card_checklists 
      WHERE card_id IN (
        SELECT id FROM kanban_cards WHERE list_id = $1
      )`,
      [id]
    );

    // Diğer kart ilişkili verileri temizle
    await pool.query('DELETE FROM kanban_card_archives WHERE card_id IN (SELECT id FROM kanban_cards WHERE list_id = $1)', [id]);
    await pool.query('DELETE FROM kanban_card_listings WHERE card_id IN (SELECT id FROM kanban_cards WHERE list_id = $1)', [id]);
    await pool.query('DELETE FROM kanban_activities WHERE card_id IN (SELECT id FROM kanban_cards WHERE list_id = $1)', [id]);
    await pool.query('DELETE FROM kanban_card_labels WHERE card_id IN (SELECT id FROM kanban_cards WHERE list_id = $1)', [id]);

    // Kartları sil
    await pool.query('DELETE FROM kanban_cards WHERE list_id = $1', [id]);
    
    // En son listeyi sil
    await pool.query('DELETE FROM kanban_lists WHERE id = $1', [id]);
    
    await pool.query('COMMIT');
    console.log('Liste başarıyla silindi:', id);
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Liste silme hatası:', error);
    console.error('Hata detayı:', error.detail);

    // Debug bilgisi
    const debugInfo = await pool.query(`
      SELECT ct.id as template_id, ccl.id as checklist_id, c.id as card_id, c.list_id
      FROM kanban_checklist_templates ct
      JOIN kanban_card_checklists ccl ON ccl.template_id = ct.id
      JOIN kanban_cards c ON ccl.card_id = c.id
      WHERE ct.list_id = $1
    `, [id]);
    console.log('Debug bilgisi:', debugInfo.rows);

    res.status(500).json({ 
      error: error.message,
      detail: error.detail,
      debug: debugInfo.rows
    });
  }
});

// routes/kanban.js
router.post('/labels', async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO kanban_labels (name, color) VALUES ($1, $2) RETURNING *',
      [name, color]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/labels/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kanban_labels WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Checklist şablonları için rotalar
// Checklist template oluşturma
router.post('/checklist-templates', async (req, res) => {
  const { list_id, title, items } = req.body;
  
  try {
    // Veri tiplerini kontrol et
    if (!Number.isInteger(list_id)) {
      throw new Error('list_id bir tam sayı olmalıdır');
    }
    
    if (!title || typeof title !== 'string') {
      throw new Error('title bir metin olmalıdır');
    }
    
    if (!Array.isArray(items)) {
      throw new Error('items bir dizi olmalıdır');
    }

    await pool.query('BEGIN');
    
    // Şablonu oluştur
    const templateResult = await pool.query(
      `INSERT INTO kanban_checklist_templates (list_id, title) 
       VALUES ($1, $2) 
       RETURNING id, title, list_id`,
      [list_id, title]
    );
    
    const template_id = templateResult.rows[0].id;
    
    // Şablon maddelerini ekle
    if (items.length > 0) {
      const itemInsertQuery = `
        INSERT INTO kanban_checklist_template_items (template_id, content, position)
        VALUES ${items.map((_, index) => `($1, $${index + 2}, ${index})`).join(',')}
        RETURNING id, content, position
      `;

      const itemParams = [template_id, ...items.map(item => item.content)];
      await pool.query(itemInsertQuery, itemParams);
    }
    
    // Oluşturulan şablonu ve maddelerini getir
    const result = await pool.query(`
      SELECT t.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', i.id,
                   'content', i.content,
                   'position', i.position
                 )
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
             ) as items
      FROM kanban_checklist_templates t
      LEFT JOIN kanban_checklist_template_items i ON t.id = i.template_id
      WHERE t.id = $1
      GROUP BY t.id`,
      [template_id]
    );
    
    await pool.query('COMMIT');
    
    res.json(result.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating checklist template:', error);
    res.status(500).json({ 
      error: error.message,
      detail: 'Şablon oluşturulurken bir hata oluştu: ' + error.message
    });
  }
});

// Kart checklistlerini getir
router.get('/cards/:cardId/checklists', async (req, res) => {
  try {
    const { cardId } = req.params;
    const result = await pool.query(`
      SELECT c.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', i.id,
                   'content', i.content,
                   'position', i.position,
                   'is_completed', i.is_completed
                 ) ORDER BY i.position
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
             ) as items,
             c.template_id  -- template_id'yi de getir
      FROM kanban_card_checklists c
      LEFT JOIN kanban_checklist_items i ON c.id = i.checklist_id
      WHERE c.card_id = $1
      GROUP BY c.id
      ORDER BY c.created_at
    `, [cardId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kart checklist'leri için rotalar
// Bir karta şablon uygulama
// Kart checklist'leri için rotalar
router.post('/cards/:cardId/checklists', async (req, res) => {
  const { cardId } = req.params;
  const { template_id, auto_applied } = req.body;

  try {
    await pool.query('BEGIN');

    // Şablon bilgilerini al
    const templateResult = await pool.query(`
      SELECT t.*, 
             json_agg(
               json_build_object(
                 'content', i.content,
                 'position', i.position
               )
             ) FILTER (WHERE i.id IS NOT NULL) as items
      FROM kanban_checklist_templates t
      LEFT JOIN kanban_checklist_template_items i ON t.id = i.template_id
      WHERE t.id = $1
      GROUP BY t.id
    `, [template_id]);

    if (templateResult.rows.length === 0) {
      throw new Error('Şablon bulunamadı');
    }


    const template = templateResult.rows[0];

    // Yeni checklist oluştur
    const checklistResult = await pool.query(
      `INSERT INTO kanban_card_checklists (card_id, title, template_id, auto_applied)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [cardId, template.title, template_id, auto_applied]  // template_id'yi kaydet
    );

    const checklist_id = checklistResult.rows[0].id;

    // Şablon maddelerini ekle
    if (template.items && template.items.length > 0) {
      const itemValues = template.items.map((_, index) => 
        `($1, $${index + 2}, ${index})`
      ).join(',');

      const itemParams = [checklist_id];
      template.items.forEach(item => {
        itemParams.push(item.content);
      });

      await pool.query(
        `INSERT INTO kanban_checklist_items (checklist_id, content, position)
         VALUES ${itemValues}`,
        itemParams
      );
    }

    await pool.query('COMMIT');

    // Oluşturulan checklist'i getir
    const result = await pool.query(`
      SELECT c.*, 
             json_agg(
               json_build_object(
                 'id', i.id,
                 'content', i.content,
                 'position', i.position,
                 'is_completed', i.is_completed
               ) ORDER BY i.position
             ) FILTER (WHERE i.id IS NOT NULL) as items
      FROM kanban_card_checklists c
      LEFT JOIN kanban_checklist_items i ON c.id = i.checklist_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [checklist_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating checklist:', error);
    res.status(500).json({ error: error.message });
  }
});




// Checklist maddelerini güncelle
router.put('/checklist-items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { is_completed } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE kanban_checklist_items SET is_completed = $1, completed_at = $2 WHERE id = $3 RETURNING *',
      [is_completed, is_completed ? 'NOW()' : null, itemId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tüm şablonları getir
router.get('/checklist-templates', async (req, res) => {

  try {
    const { rows } = await pool.query(`
      SELECT t.*, 
             json_agg(json_build_object(
               'id', i.id,
               'content', i.content,
               'position', i.position
             )) as items
      FROM kanban_checklist_templates t
      LEFT JOIN kanban_checklist_template_items i ON t.id = i.template_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Şablon sil
router.delete('/checklist-templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM kanban_checklist_templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Checklist'i sil
router.delete('/checklists/:checklistId', async (req, res) => {
  try {
    await pool.query('DELETE FROM kanban_card_checklists WHERE id = $1', [req.params.checklistId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ error: error.message });
  }
});


// Checklist item ekle
router.post('/checklists/:checklistId/items', async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { content } = req.body;

    const result = await pool.query(`
      INSERT INTO kanban_checklist_items (checklist_id, content, position)
      SELECT $1, $2, COALESCE(MAX(position) + 1, 0)
      FROM kanban_checklist_items
      WHERE checklist_id = $1
      RETURNING *
    `, [checklistId, content]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding checklist item:', error);
    res.status(500).json({ error: error.message });
  }
});



// Liste bazında şablonları getir
// Liste bazında şablonları getir
router.get('/lists/:listId/checklist-templates', async (req, res) => {
  try {
    const { listId } = req.params;
    
    // listId'nin sayı olduğundan emin ol
    if (!Number.isInteger(parseInt(listId))) {
      throw new Error('Geçersiz liste ID');
    }

    const { rows } = await pool.query(`
      SELECT t.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', i.id,
                   'content', i.content,
                   'position', i.position
                 )
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
             ) as items
      FROM kanban_checklist_templates t
      LEFT JOIN kanban_checklist_template_items i ON t.id = i.template_id
      WHERE t.list_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [listId]);

    console.log(`Templates found for list ${listId}:`, rows.length); // Debug log
    res.json(rows);
  } catch (error) {
    console.error('Error fetching list templates:', error);
    res.status(500).json({ error: error.message });
  }
});


// Otomasyon kurallarını getir
router.get('/automation-rules', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM kanban_list_automation_rules 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Yeni otomasyon kuralı ekle
router.post('/lists/automation-rules', async (req, res) => {
  const { source_list_id, target_list_id, condition_type, checklist_template_ids } = req.body;
  
  try {
    const { rows } = await pool.query(
      `INSERT INTO kanban_list_automation_rules 
       (source_list_id, target_list_id, condition_type, checklist_template_ids)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [source_list_id, target_list_id, condition_type, checklist_template_ids]
    );
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error creating automation rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Otomasyon kuralını sil
router.delete('/automation-rules/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM kanban_list_automation_rules WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Belirli bir liste için otomasyon kurallarını getir
router.get('/lists/:listId/automation-rules', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM kanban_list_automation_rules 
       WHERE source_list_id = $1
       ORDER BY created_at DESC`,
      [req.params.listId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching list automation rules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kullanıcı fotoğrafını getir
router.get('/users/:userId/photo', async (req, res) => {
  try {
    console.log('Fotoğraf isteği alındı - User ID:', req.params.userId);

    // Önce user'ın personnel_id'sini bulalım
    const userResult = await pool.query(
      'SELECT personnel_id FROM users WHERE id = $1',
      [req.params.userId]
    );
    console.log('User sorgu sonucu:', userResult.rows);


    if (userResult.rows.length === 0) {
      console.log('Kullanıcı bulunamadı');

      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const personnel_id = userResult.rows[0].personnel_id;
    console.log('Personnel ID:', personnel_id);

    // Personnel ID ile fotoğrafı bulalım
    const photoResult = await pool.query(
      'SELECT photo_url FROM personnel_photos WHERE personnel_id = $1',
      [personnel_id]
    );
    console.log('Fotoğraf sorgu sonucu:', photoResult.rows);

    if (photoResult.rows.length === 0) {
      console.log('Fotoğraf bulunamadı');

      return res.json({ photo_url: null });
    }

    const photoUrl = photoResult.rows[0].photo_url;
    console.log('Bulunan fotoğraf URL:', photoUrl);

    res.json({ photo_url: photoResult.rows[0].photo_url });
  } catch (error) {
    console.error('Error fetching user photo:', error);
    res.status(500).json({ error: error.message });
  }
});



// Arşiv dosyası yükleme
router.post('/cards/:cardId/archives', archiveUpload.single('file'), async (req, res) => {
  try {
    const { cardId } = req.params;
    const { file } = req;
    
    const result = await pool.query(
      `INSERT INTO kanban_card_archives (card_id, file_name, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cardId, file.originalname, file.path, file.size, req.user.userId]
    );

    // Aktivite ekle
    await pool.query(
      `INSERT INTO kanban_activities (card_id, user_id, action_type, description)
       VALUES ($1, $2, $3, $4)`,
      [cardId, req.user.userId, 'archive_upload', `Arşiv dosyası yüklendi: ${file.originalname}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listing dosyası yükleme
router.post('/cards/:cardId/listings', listingUpload.single('file'), async (req, res) => {
  try {
    const { cardId } = req.params;
    const { file } = req;
    
    const result = await pool.query(
      `INSERT INTO kanban_card_listings (card_id, file_name, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cardId, file.originalname, file.path, file.size, req.user.userId]
    );

    // Aktivite ekle
    await pool.query(
      `INSERT INTO kanban_activities (card_id, user_id, action_type, description)
       VALUES ($1, $2, $3, $4)`,
      [cardId, req.user.userId, 'listing_upload', `Listing dosyası yüklendi: ${file.originalname}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Arşiv dosyalarını getir
router.get('/cards/:cardId/archives', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.username as uploaded_by_name 
       FROM kanban_card_archives a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.card_id = $1
       ORDER BY a.uploaded_at DESC`,
      [req.params.cardId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listing dosyalarını getir
router.get('/cards/:cardId/listings', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.username as uploaded_by_name 
       FROM kanban_card_listings l
       LEFT JOIN users u ON l.uploaded_by = u.id
       WHERE l.card_id = $1
       ORDER BY l.uploaded_at DESC`,
      [req.params.cardId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;