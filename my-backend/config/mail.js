const nodemailer = require('nodemailer');
const { generateResponseToken } = require('../utils/tokenUtils');


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',  // veya kullanacağınız SMTP sunucusu
    port: 465,
    secure: true,
    auth: {
        user: 'tinassemih@gmail.com',  // Gmail adresiniz
        pass: 'sznw wjlo hsoo avzp'      // Gmail App Password
    }
});

const mailConfig = {
    fromName: 'Meeting System',
    fromEmail: 'tinassemih@gmail.com',
    frontendUrl: 'http://localhost:3000',

    // Email gönderme fonksiyonu
    sendMail: async ({ to, subject, html }) => {
        try {
            const info = await transporter.sendMail({
                from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
                to,
                subject,
                html
            });
            console.log('Message sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    },

    // Email şablonları
    templates: {
        meetingInvitation: (data) => {
            const responseToken = generateResponseToken(data.meetingId, data.personnelId);
            return {
                subject: `Toplantı Daveti: ${data.meetingTitle}`,
                html: `
                                    <h2>Toplantı Daveti</h2>
                    <p>Sayın ${data.name},</p>
                    <p>Aşağıdaki toplantıya davetlisiniz:</p>
                    <div style="margin: 20px 0; padding: 15px; background: #f5f5f5;">
                        <p><strong>Başlık:</strong> ${data.meetingTitle}</p>
                        <p><strong>Tarih:</strong> ${new Date(data.startTime).toLocaleString('tr-TR')} - ${new Date(data.endTime).toLocaleString('tr-TR')}</p>
                        <p><strong>Konum:</strong> ${data.location}</p>
                    </div>
                    <p>Lütfen katılım durumunuzu belirtmek için aşağıdaki bağlantıları kullanın:</p>
                    <div style="margin: 20px 0;">
                    <a href="${mailConfig.frontendUrl}/meetings/${data.meetingId}/respond?response=accepted&token=${responseToken}" 
                       style="padding: 10px 20px; background: #52c41a; color: white; text-decoration: none; margin-right: 10px;">
                        Katılıyorum
                    </a>
                    <a href="${mailConfig.frontendUrl}/meetings/${data.meetingId}/respond?response=declined&token=${responseToken}" 
                       style="padding: 10px 20px; background: #f5222d; color: white; text-decoration: none;">
                        Katılamıyorum
                    </a>
                `
            };
        },

        statusUpdate: (data) => ({
            subject: `Toplantı Katılım Durumu Güncellendi: ${data.meetingTitle}`,
            html: `
                <h2>Toplantı Katılım Durumu Güncellemesi</h2>
                <p>Sayın ${data.name},</p>
                <p>Aşağıdaki toplantı için katılım durumunuz güncellenmiştir:</p>
                <div style="margin: 20px 0; padding: 15px; background: #f5f5f5;">
                    <p><strong>Başlık:</strong> ${data.meetingTitle}</p>
                    <p><strong>Tarih:</strong> ${new Date(data.startTime).toLocaleString('tr-TR')} - ${new Date(data.endTime).toLocaleString('tr-TR')}</p>
                    <p><strong>Yeni Durum:</strong> ${
                        data.status === 'accepted' ? 'Katılıyor' :
                        data.status === 'declined' ? 'Katılamıyor' :
                        'Yanıt Bekleniyor'
                    }</p>
                </div>
                <p>Bu otomatik bir bilgilendirme mailidir, yanıtlamanıza gerek yoktur.</p>
            `
        }),

        minutesShared: (data) => ({
            subject: `Toplantı Tutanağı Paylaşıldı: ${data.meetingTitle}`,
            html: `
                <h2>Toplantı Tutanağı</h2>
                <p>Sayın ${data.name},</p>
                <p>${data.meetingTitle} toplantısının tutanağı paylaşılmıştır.</p>
                <div style="margin: 20px 0; padding: 15px; background: #f5f5f5;">
                    <p><strong>Toplantı Tarihi:</strong> ${new Date(data.meetingDate).toLocaleString('tr-TR')}</p>
                    <p><strong>Tutanak Özeti:</strong></p>
                    <div style="margin-top: 10px;">
                        ${data.summary}
                    </div>
                </div>
                <p>Detaylı tutanağı görmek için <a href="${mailConfig.frontendUrl}/meetings/${data.meetingId}/minutes">tıklayın</a>.</p>
            `
        }),
        shiftPlanNotification: (data) => ({
            subject: `Yeni Vardiya Planınız - ${data.departmentName}`,
            html: `
                <h2>Vardiya Planınız Yayınlandı</h2>
                <p>Sayın ${data.name},</p>
                <p>${data.startDate} - ${data.endDate} tarihleri arasındaki vardiya planınız aşağıdadır:</p>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <th style="border: 1px solid #ccc; padding: 8px;">Tarih</th>
                        <th style="border: 1px solid #ccc; padding: 8px;">Vardiya</th>
                    </tr>
                    ${data.shifts.map(shift => `
                    <tr>
                        <td style="border: 1px solid #ccc; padding: 8px;">${shift.date}</td>
                        <td style="border: 1px solid #ccc; padding: 8px;">${shift.shiftName} (${shift.startTime}-${shift.endTime})</td>
                    </tr>
                    `).join('')}
                </table>
                <p>İyi çalışmalar dileriz.</p>
            `
        })
    }
};

module.exports = mailConfig;