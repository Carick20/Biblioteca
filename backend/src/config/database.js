/**
 * config/database.js
 * ─────────────────────────────────────────────────────────────
 * Pool de conexiones MySQL usando mysql2/promise.
 * Expone pool.query() y pool.getConnection() con la misma API
 * que ya usan todas las rutas del proyecto.
 * ─────────────────────────────────────────────────────────────
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'biblioteca_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  // Devuelve JS Date objects para columnas DATE/DATETIME
  dateStrings:        true,
});

module.exports = pool;
