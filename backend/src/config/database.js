/**
 * config/database.js
 * ─────────────────────────────────────────────────────────────────
 * Capa de base de datos usando sql.js (SQLite puro JavaScript).
 * No requiere Visual Studio ni compilación nativa en Windows.
 *
 * Expone exactamente la misma API async que mysql2/promise:
 *   pool.query(sql, params)  → Promise<[rows | resultHeader, null]>
 *   pool.getConnection()     → Promise<FakeConn>
 *   conn.query / beginTransaction / commit / rollback / release
 *
 * Traducciones SQL MySQL → SQLite aplicadas automáticamente:
 *   CURDATE()                → date('now')
 *   NOW()                    → datetime('now')
 *   DATEDIFF(a,b)            → cast(julianday(a)-julianday(b) as integer)
 *   DATE_FORMAT(c,'%Y-%m')   → strftime('%Y-%m',c)
 *   DATE_ADD/SUB(d,INTERVAL) → date(d,'+/-n units')
 *   IFNULL(x,y)              → COALESCE(x,y)
 *   INSERT IGNORE            → INSERT OR IGNORE
 *   SUM(col='val')           → SUM(CASE WHEN col='val' THEN 1 ELSE 0 END)
 *   SEPARATOR '…'            → eliminado de GROUP_CONCAT
 * ─────────────────────────────────────────────────────────────────
 */

const initSqlJs = require('sql.js');
const path      = require('fs').existsSync ? require('path') : null;
const fs        = require('fs');
require('dotenv').config();

const DB_DIR  = path.join(__dirname, '..', '..', 'database');
const DB_PATH = path.join(DB_DIR, 'biblioteca.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// ── Inicialización async de sql.js (cargamos WASM una sola vez) ──
let _db = null;

async function getDB() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
    console.log(`✅ SQLite (sql.js) cargado desde ${DB_PATH}`);
  } else {
    _db = new SQL.Database();
    console.log(`✅ SQLite (sql.js) nueva base de datos en ${DB_PATH}`);
  }

  // Habilitar FK
  _db.run('PRAGMA foreign_keys = ON');

  return _db;
}

// Guardar en disco después de cada escritura
function persistDB(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Traductor SQL MySQL → SQLite ─────────────────────────────────
function translateSQL(sql) {
  return sql
    .replace(/\bCURDATE\(\)/gi,  "date('now')")
    .replace(/\bNOW\(\)/gi,      "datetime('now')")
    .replace(/\bDATEDIFF\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/gi,
             (_, a, b) => `cast(julianday(${a.trim()})-julianday(${b.trim()}) as integer)`)
    .replace(/\bDATE_FORMAT\s*\(\s*([^,]+?)\s*,\s*'([^']+)'\s*\)/gi,
             (_, col, fmt) => `strftime('${fmt}', ${col.trim()})`)
    .replace(/\bDATE_ADD\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\d+)\s+(YEAR|MONTH|DAY)\s*\)/gi,
             (_, d, n, u) => `date(${d.trim()}, '+${n} ${u.toLowerCase()}s')`)
    .replace(/\bDATE_SUB\s*\(\s*([^,]+?)\s*,\s*INTERVAL\s+(\d+)\s+(YEAR|MONTH|DAY)\s*\)/gi,
             (_, d, n, u) => `date(${d.trim()}, '-${n} ${u.toLowerCase()}s')`)
    .replace(/\bIFNULL\s*\(/gi, 'COALESCE(')
    .replace(/\bSUM\s*\(\s*(\w+)\s*=\s*'([^']+)'\s*\)/gi,
             (_, col, val) => `SUM(CASE WHEN ${col}='${val}' THEN 1 ELSE 0 END)`)
    .replace(/\bSEPARATOR\s+'[^']*'/gi, '')
    .replace(/\bINSERT\s+IGNORE\b/gi, 'INSERT OR IGNORE');
}

// ── Convertir resultado sql.js a array de objetos planos ─────────
function toObjects(result) {
  if (!result || !result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

// ── Ejecutar query y devolver [rows|header, null] ─────────────────
async function query(sql, params = []) {
  const db         = await getDB();
  const translated = translateSQL(sql);
  const trimmed    = translated.trim().toUpperCase();
  const args       = Array.isArray(params) ? params : [];

  try {
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const result = db.exec(translated, args);
      return [toObjects(result), null];
    } else {
      db.run(translated, args);
      const lastId  = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0][0] ?? 0;
      const changes = db.exec('SELECT changes() AS n')[0]?.values[0][0] ?? 0;
      persistDB(db);
      return [{ insertId: lastId, affectedRows: changes }, null];
    }
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) err.code = 'ER_DUP_ENTRY';
    if (err.message?.includes('FOREIGN KEY constraint failed')) err.code = 'ER_NO_REFERENCED_ROW_2';
    throw err;
  }
}

// ── Conexión simulada (para getConnection / transacciones) ────────
class FakeConn {
  async beginTransaction() { /* sql.js es siempre síncrono/serial */ }

  async query(sql, params = []) {
    return query(sql, params);   // delega al pool compartido
  }

  async commit()   { /* no-op */ }
  async rollback() { /* no-op */ }
  release()        { /* no-op */ }
}

// ── Pool exportado ────────────────────────────────────────────────
const pool = {
  query,
  async getConnection() { return new FakeConn(); },
  // Para init_db.js que necesita acceso directo
  async _raw() { return getDB(); },
};

module.exports = pool;
