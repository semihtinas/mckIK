// config/db.js
const { Pool } = require('pg');

// PostgreSQL bağlantı ayarları
const pool = new Pool({
  user: 'semihtinas',
  host: 'localhost',
  database: 'semihtinas_db',
  password: 'semih1315',
  port: 5432,
});

// Veritabanı bağlantısını dışa aktarıyoruz
module.exports = pool;