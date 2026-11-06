const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* GET /api/lectores */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lc.*,
              p.tipo_documento, p.numero_documento,
              p.nombres, p.apellidos, p.correo, p.telefono,
              (p.nombres || ' ' || p.apellidos) AS nombre_completo,
              t.nombre AS tipo_lector
       FROM lector lc
       JOIN persona    p ON p.id_persona     = lc.id_persona
       JOIN tipo_lector t ON t.id_tipo_lector = lc.id_tipo_lector
       ORDER BY p.apellidos, p.nombres`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/lectores/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lc.*,
              p.tipo_documento, p.numero_documento,
              p.nombres, p.apellidos, p.correo, p.telefono, p.direccion,
              t.nombre AS tipo_lector
       FROM lector lc
       JOIN persona    p ON p.id_persona     = lc.id_persona
       JOIN tipo_lector t ON t.id_tipo_lector = lc.id_tipo_lector
       WHERE lc.id_lector = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lector no encontrado.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/* POST /api/lectores */
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { tipo_documento = 'DNI', numero_documento, nombres, apellidos,
            correo, telefono, direccion, id_tipo_lector } = req.body;

    if (!numero_documento || !nombres || !apellidos || !id_tipo_lector) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const [pr] = await conn.query(
      `INSERT INTO persona(tipo_documento, numero_documento, nombres, apellidos, correo, telefono, direccion)
       VALUES(?,?,?,?,?,?,?)`,
      [tipo_documento, numero_documento.trim(), nombres.trim(), apellidos.trim(),
       correo || null, telefono || null, direccion || null]
    );
    const id_persona = pr.insertId;

    const hoy    = new Date().toISOString().slice(0, 10);
    const vence  = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    const codigo = `LEC-${String(id_persona).padStart(4, '0')}`;

    const [lr] = await conn.query(
      `INSERT INTO lector(id_persona, id_tipo_lector, codigo_lector, fecha_inscripcion, fecha_vencimiento)
       VALUES(?,?,?,?,?)`,
      [id_persona, id_tipo_lector, codigo, hoy, vence]
    );

    await conn.commit(); conn.release();
    res.status(201).json({ message: 'Lector registrado.', id_lector: lr.insertId, codigo_lector: codigo });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

/* PUT /api/lectores/:id */
router.put('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { nombres, apellidos, correo, telefono, direccion, estado, id_tipo_lector } = req.body;

    const [[lector]] = await conn.query(
      'SELECT id_persona FROM lector WHERE id_lector = ?', [req.params.id]);
    if (!lector) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Lector no encontrado.' });
    }

    await conn.query(
      `UPDATE persona SET
         nombres   = COALESCE(?, nombres),
         apellidos = COALESCE(?, apellidos),
         correo    = ?,
         telefono  = ?,
         direccion = ?
       WHERE id_persona = ?`,
      [nombres || null, apellidos || null, correo || null,
       telefono || null, direccion || null, lector.id_persona]
    );

    await conn.query(
      `UPDATE lector SET
         id_tipo_lector = COALESCE(?, id_tipo_lector),
         estado         = COALESCE(?, estado)
       WHERE id_lector = ?`,
      [id_tipo_lector || null, estado || null, req.params.id]
    );

    await conn.commit(); conn.release();
    res.json({ message: 'Lector actualizado.' });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

/* DELETE /api/lectores/:id  (baja lógica) */
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query("UPDATE lector SET estado='INACTIVO' WHERE id_lector=?", [req.params.id]);
    res.json({ message: 'Lector dado de baja.' });
  } catch (err) { next(err); }
});

module.exports = router;
