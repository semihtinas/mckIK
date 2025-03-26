const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Authorization başlığını kontrol et ve token'ı ayrıştır
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // 'Bearer <token>' formatını ayır

    if (!token) {
        return res.status(401).json({ message: 'Token gerekli' });
    }

    try {
        // Token'ı doğrula
        const decoded = jwt.verify(token, 'gizliAnahtar'); // Gizli anahtarı burada kullan
        req.user = decoded; // Token'dan gelen kullanıcı bilgilerini req.user'a ekliyoruz
        next(); // İşlem başarılı, bir sonraki middleware'e geç
    } catch (error) {
        console.error('Geçersiz token:', error.message); // Hata mesajını yazdır
        return res.status(403).json({ message: 'Geçersiz token' });
    }
};

module.exports = authMiddleware;
