// utils/tokenUtils.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'gizliAnahtar'; // Aynı gizli anahtarı kullanıyoruz

const generateResponseToken = (meetingId, personnelId) => {
    return jwt.sign(
        {
            meetingId,
            personnelId,
            purpose: 'meeting-response'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const verifyResponseToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose !== 'meeting-response') {
            throw new Error('Invalid token purpose');
        }
        return decoded;
    } catch (error) {
        console.error('Token verification error:', error);
        throw error;
    }
};

module.exports = {
    generateResponseToken,
    verifyResponseToken
};