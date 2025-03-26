// services/eventBasedLeaveService.js

const pool = require('../config/db');

class EventBasedLeaveService {
    // İzin hakkı kontrolü
    static async checkLeaveEligibility(personnelId, leaveTypeId) {
        try {
            // 1. İzin tipini kontrol et
            const leaveType = await pool.query(
                `SELECT * FROM leave_types 
                 WHERE id = $1 AND is_event_based = true`,
                [leaveTypeId]
            );

            if (!leaveType.rows.length) {
                throw new Error('Invalid event-based leave type');
            }

            // 2. Personel cinsiyet kontrolü
            const personnelGender = await pool.query(
                `SELECT gender FROM personnel WHERE id = $1`,
                [personnelId]
            );

            if (!personnelGender.rows.length) {
                throw new Error('Personnel not found');
            }

            const requiredGender = leaveType.rows[0].required_gender;
            const actualGender = personnelGender.rows[0].gender;

            if (requiredGender && requiredGender !== actualGender) {
                throw new Error(`This leave type requires ${requiredGender} gender`);
            }

            return {
                eligible: true,
                maxDays: leaveType.rows[0].max_days,
                leaveType: leaveType.rows[0]
            };
        } catch (error) {
            console.error('Error checking leave eligibility:', error);
            throw error;
        }
    }

    // Olay bazlı izin talebi oluştur
    static async createEventBasedLeaveRequest(personnelId, leaveTypeId, startDate, reason) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Uygunluk kontrolü
            const eligibility = await this.checkLeaveEligibility(personnelId, leaveTypeId);
            
            if (!eligibility.eligible) {
                throw new Error('Not eligible for this leave type');
            }

            // İzin bitiş tarihini hesapla
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + eligibility.maxDays - 1);

            // İzin talebini oluştur
            const result = await client.query(
                `INSERT INTO leave_requests 
                 (personnel_id, leave_type_id, start_date, end_date, status, reason)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    personnelId,
                    leaveTypeId,
                    startDate,
                    endDate,
                    'Pending',
                    reason
                ]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating event-based leave request:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Bu tür izin kullanım geçmişini getir
    static async getEventBasedLeaveHistory(personnelId, leaveTypeId) {
        try {
            const result = await pool.query(
                `SELECT 
                    lr.*,
                    lt.name as leave_type_name,
                    lt.max_days
                 FROM leave_requests lr
                 JOIN leave_types lt ON lr.leave_type_id = lt.id
                 WHERE lr.personnel_id = $1 
                 AND lr.leave_type_id = $2
                 ORDER BY lr.start_date DESC`,
                [personnelId, leaveTypeId]
            );

            return result.rows;
        } catch (error) {
            console.error('Error fetching event-based leave history:', error);
            throw error;
        }
    }
}

module.exports = EventBasedLeaveService;