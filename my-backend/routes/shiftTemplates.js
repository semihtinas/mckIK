// routes/shiftTemplates.js
// shiftTemplates.js (backend dosyası)

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/authMiddleware');
const dayjs = require('dayjs'); // `dayjs` modülünü import edin
const isoWeek = require('dayjs/plugin/isoWeek');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);

// Şablon listesi
router.get('/templates', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                st.*,
                d.name as department_name,
                json_agg(
                    json_build_object(
                        'id', std.id,
                        'day_index', std.day_index,
                        'shift_schedule_id', std.shift_schedule_id,
                        'shift_name', ss.name,
                        'start_time', ss.start_time,
                        'end_time', ss.end_time,
                        'rest_day', false
                    ) ORDER BY std.day_index
                ) as patterns
            FROM shift_templates st
            LEFT JOIN departments d ON st.department_id = d.id
            LEFT JOIN shift_template_details std ON st.id = std.template_id
            LEFT JOIN shift_schedules ss ON std.shift_schedule_id = ss.id
            WHERE st.is_active = true
            GROUP BY st.id, d.name
            ORDER BY st.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Express.js örneği


// Şablon oluşturma
// routes/shiftTemplates.js
router.post('/templates', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            name,
            department_id,
            is_rotation,
            rotation_days,
            patterns // Patterns olarak alıyoruz artık, shifts değil
        } = req.body;

        await client.query('BEGIN');

        // Şablon oluştur
        const templateResult = await client.query(`
            INSERT INTO shift_templates (
                name, 
                department_id, 
                is_rotation, 
                rotation_days,
                created_by,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING *
        `, [name, department_id, is_rotation, rotation_days, req.user.personnelId]);

        // Patterns null veya undefined değilse işleme devam et
        if (patterns && Array.isArray(patterns)) {
            // Pattern'ları ekle
            for (const pattern of patterns) {
                await client.query(`
                    INSERT INTO shift_template_details (
                        template_id, 
                        day_index, 
                        shift_schedule_id
                    )
                    VALUES ($1, $2, $3)
                `, [
                    templateResult.rows[0].id,
                    pattern.day_index,
                    pattern.shift_schedule_id
                ]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json(templateResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating template:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


router.get('/templates/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                st.*,
                d.name as department_name,
                json_agg(
                    json_build_object(
                        'id', std.id,
                        'day_index', std.day_index,
                        'shift_schedule_id', std.shift_schedule_id,
                        'shift_name', ss.name,
                        'start_time', ss.start_time,
                        'end_time', ss.end_time,
                        'rest_day', false
                    ) ORDER BY std.day_index
                ) as patterns
            FROM shift_templates st
            LEFT JOIN departments d ON st.department_id = d.id
            LEFT JOIN shift_template_details std ON st.id = std.template_id
            LEFT JOIN shift_schedules ss ON std.shift_schedule_id = ss.id
            WHERE st.id = $1
            GROUP BY st.id, d.name
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Şablonu uygula
// routes/shiftTemplates.js

// Şablon uygulama endpoint'i
// shiftTemplates.js dosyasında
router.post('/templates/:id/apply', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
      const templateId = req.params.id;
      const { start_date, end_date, personnel_ids, group_ids } = req.body;
      const createdBy = req.user.id;
  
      await client.query('BEGIN');
  
      // Tüm personel ID'lerini al
      let allPersonnelIds = [];
  
      if (Array.isArray(personnel_ids) && personnel_ids.length > 0) {
        allPersonnelIds = personnel_ids;
      }
  
      if (Array.isArray(group_ids) && group_ids.length > 0) {
        const groupPersonnelResult = await client.query(`
          SELECT personnel_id FROM personnel_shift_group_members
          WHERE group_id = ANY($1::int[])
        `, [group_ids]);
  
        const groupPersonnelIds = groupPersonnelResult.rows.map(row => row.personnel_id);
        allPersonnelIds = allPersonnelIds.concat(groupPersonnelIds);
      }
  
      if (!allPersonnelIds || allPersonnelIds.length === 0) {
        throw new Error('At least one personnel or group must be selected');
      }
  
      // Şablon detaylarını alın
      const templateResult = await client.query(`
        SELECT * FROM shift_templates WHERE id = $1
      `, [templateId]);
      const template = templateResult.rows[0];
  
      const shiftsResult = await client.query(`
        SELECT * FROM shift_template_details WHERE template_id = $1 ORDER BY day_index
      `, [templateId]);
      const shifts = shiftsResult.rows;
  
      if (!template || shifts.length === 0) {
        throw new Error('Template not found or has no shifts');
      }
  
      // Tarih aralığını oluşturun
      const startDate = dayjs(start_date);
      const endDate = dayjs(end_date);
  
      // Tarih aralığındaki günleri hesaplayın
      const totalDays = endDate.diff(startDate, 'day') + 1;
  
      // Her gün için vardiya atamalarını oluşturun
      for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
        const currentDate = startDate.add(dayOffset, 'day');
        const dayIndex = dayOffset % shifts.length;
  
        const shift = shifts[dayIndex];
        const assignmentDate = currentDate.format('YYYY-MM-DD');
  
        for (const personnelId of allPersonnelIds) {
          await client.query(`
            INSERT INTO shift_assignments 
            (shift_schedule_id, personnel_id, assignment_date, status, created_by)
            VALUES ($1, $2, $3, 'active', $4)
          `, [shift.shift_schedule_id, personnelId, assignmentDate, createdBy]);
        }
      }
  
      await client.query('COMMIT');
      res.json({ message: 'Şablon başarıyla uygulandı' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in template application:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  });


  // Şablon güncelleme
router.put('/templates/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            name,
            department_id,
            is_rotation,
            rotation_days,
            patterns
        } = req.body;

        await client.query('BEGIN');

        // Şablonu güncelle
        await client.query(`
            UPDATE shift_templates
            SET
                name = $1,
                department_id = $2,
                is_rotation = $3,
                rotation_days = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [name, department_id, is_rotation, rotation_days, id]);

        // Mevcut pattern'ları sil
        await client.query(`
            DELETE FROM shift_template_details
            WHERE template_id = $1
        `, [id]);

        // Yeni pattern'ları ekle
        if (patterns && Array.isArray(patterns)) {
            for (const pattern of patterns) {
                await client.query(`
                    INSERT INTO shift_template_details (
                        template_id,
                        day_index,
                        shift_schedule_id
                    )
                    VALUES ($1, $2, $3)
                `, [
                    id,
                    pattern.day_index,
                    pattern.shift_schedule_id
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Şablon başarıyla güncellendi' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating template:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

  
  

// Vardiya grupları için API'ler
// Grup listesi
// routes/shiftTemplates.js içinde
router.get('/groups', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                psg.*,
                d.name as department_name,
                st.name as template_name,
                COUNT(DISTINCT psgm.id) as member_count,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', p.id,
                            'first_name', p.first_name,
                            'last_name', p.last_name,
                            'department_name', d.name
                        )
                    )
                    FROM personnel_shift_group_members psgm
                    JOIN personnel p ON p.id = psgm.personnel_id
                    LEFT JOIN personnel_departments pd ON p.id = pd.personnel_id
                    LEFT JOIN departments d ON pd.department_id = d.id
                    WHERE psgm.group_id = psg.id AND psg.is_active = true
                ) as members
            FROM personnel_shift_groups psg
            LEFT JOIN departments d ON psg.department_id = d.id
            LEFT JOIN shift_templates st ON psg.template_id = st.id
            LEFT JOIN personnel_shift_group_members psgm ON psg.id = psgm.group_id
            WHERE psg.is_active = true
            GROUP BY psg.id, d.name, st.name
            ORDER BY psg.created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// routes/shiftTemplates.js - groups endpoint'i
// routes/shiftTemplates.js - groups endpoint'i
router.post('/groups', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { 
            name, 
            department_id, 
            template_id, 
            rotation_start_date,
            personnel_ids 
        } = req.body;

        console.log('Creating group with data:', {
            name, department_id, template_id, rotation_start_date, personnel_ids
        });

        await client.query('BEGIN');

        // Grubu oluştur
        const groupResult = await client.query(`
            INSERT INTO personnel_shift_groups (
                name, 
                department_id, 
                template_id, 
                rotation_start_date,
                created_at
            )
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING id
        `, [name, department_id, template_id, rotation_start_date]);

        const groupId = groupResult.rows[0].id;

        // Grup üyelerini ekle
        if (personnel_ids && personnel_ids.length > 0) {
            const values = personnel_ids
                .map((_, index) => `($1, $${index + 2}, CURRENT_TIMESTAMP)`)
                .join(',');

            await client.query(`
                INSERT INTO personnel_shift_group_members 
                (group_id, personnel_id, created_at)
                VALUES ${values}
            `, [groupId, ...personnel_ids]);
        }

        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            message: 'Grup başarıyla oluşturuldu',
            groupId
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

router.put('/groups/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { 
            name, 
            department_id, 
            template_id, 
            rotation_start_date,
            personnel_ids 
        } = req.body;

        await client.query('BEGIN');

        // Grubu güncelle
        await client.query(`
            UPDATE personnel_shift_groups 
            SET 
                name = $1,
                department_id = $2,
                template_id = $3,
                rotation_start_date = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [name, department_id, template_id, rotation_start_date, id]);

        // Mevcut grup üyelerini temizle
        await client.query(`
            DELETE FROM personnel_shift_group_members 
            WHERE group_id = $1
        `, [id]);

        // Yeni grup üyelerini ekle
        if (personnel_ids && personnel_ids.length > 0) {
            const values = personnel_ids
                .map((_, index) => `($1, $${index + 2}, CURRENT_TIMESTAMP)`)
                .join(',');

            await client.query(`
                INSERT INTO personnel_shift_group_members 
                (group_id, personnel_id, created_at)
                VALUES ${values}
            `, [id, ...personnel_ids]);
        }

        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Grup başarıyla güncellendi'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating group:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
}); 

// Grup üyelerini güncelle
router.put('/groups/:id/members', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { personnel_ids } = req.body;

        await client.query('BEGIN');

        // Mevcut üyeleri deaktive et
        await client.query(`
            UPDATE personnel_shift_group_members
            SET is_active = false
            WHERE group_id = $1
        `, [id]);

        // Yeni üyeleri ekle veya reaktive et
        if (personnel_ids && personnel_ids.length > 0) {
            const values = personnel_ids
                .map((_, index) => `($1, $${index + 2})`)
                .join(',');

            await client.query(`
                INSERT INTO personnel_shift_group_members (group_id, personnel_id)
                VALUES ${values}
                ON CONFLICT (group_id, personnel_id) 
                DO UPDATE SET is_active = true, joined_at = CURRENT_TIMESTAMP
            `, [id, ...personnel_ids]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Group members updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating group members:', error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});


// Grup şablonunu uygula
router.post('/groups/:id/apply-template', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const groupId = req.params.id;
        const { start_date, end_date } = req.body;

        // Tarih aralığını kontrol edin
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Başlangıç ve bitiş tarihleri gereklidir' });
        }

        const groupResult = await client.query('SELECT * FROM shift_groups WHERE id = $1', [groupId]);
        const group = groupResult.rows[0];

        if (!group) {
            return res.status(404).json({ error: 'Grup bulunamadı' });
        }

        const templateId = group.template_id;
        const rotationStartDate = group.rotation_start_date || start_date;
        const isRotation = group.is_rotation;

        // Şablon bilgilerini alın
        const templateResult = await client.query('SELECT * FROM shift_templates WHERE id = $1', [templateId]);
        const template = templateResult.rows[0];

        if (!template) {
            return res.status(404).json({ error: 'Şablon bulunamadı' });
        }

        // Şablon desenlerini alın ve day_index'e göre sırala
        const templateDetails = await client.query(`
            SELECT * FROM shift_template_details
            WHERE template_id = $1
            ORDER BY day_index ASC
        `, [templateId]);

        if (templateDetails.rows.length === 0) {
            return res.status(400).json({ error: 'Şablon detayları bulunamadı' });
        }

        // Rotasyon periyodunu şablonun gün sayısına eşitleyin
        const rotationPeriod = templateDetails.rows.length;

        // Gruba ait personel ID'lerini alın
        const personnelResult = await client.query(`
            SELECT personnel_id FROM shift_group_personnels
            WHERE group_id = $1 AND is_active = true
        `, [groupId]);

        const personnel_ids = personnelResult.rows.map(row => row.personnel_id);

        // Her personel için vardiyaları oluştur
        await client.query('BEGIN');

        for (const personnelId of personnel_ids) {
            let currentDate = new Date(start_date);
            const endDate = new Date(end_date);

            while (currentDate <= endDate) {
                let shift;

                if (isRotation) {
                    // Rotasyonlu ise, day_index'i rotasyon periyoduna göre hesaplayın
                    const daysSinceStart = Math.floor((currentDate - new Date(rotationStartDate)) / (86400000));
                    const dayIndex = daysSinceStart % rotationPeriod;

                    shift = templateDetails.rows.find(s => s.day_index === dayIndex);
                } else {
                    // Rotasyon yoksa, day_index'i başlangıç tarihine göre hesaplayın
                    const daysSinceStart = Math.floor((currentDate - new Date(start_date)) / (86400000));
                    const dayIndex = daysSinceStart;

                    shift = templateDetails.rows.find(s => s.day_index === dayIndex);
                }

                if (shift) {
                    await client.query(`
                        INSERT INTO personnel_shift_assignments (
                            personnel_id,
                            shift_schedule_id,
                            assignment_date,
                            status,
                            created_at,
                            is_active
                        )
                        VALUES ($1, $2, $3, 'SCHEDULED', CURRENT_TIMESTAMP, true)
                        ON CONFLICT (personnel_id, assignment_date) 
                        DO UPDATE SET 
                            shift_schedule_id = $2,
                            updated_at = CURRENT_TIMESTAMP
                    `, [personnelId, shift.shift_schedule_id, currentDate]);
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        await client.query('COMMIT');

        res.json({ message: 'Şablon başarıyla uygulandı' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error applying template:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});





module.exports = router;