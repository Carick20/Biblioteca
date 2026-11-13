const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* ─────────────────────────────────────────────────────────────
   GET /api/multas
   Parámetros opcionales:
     ?estado=PENDIENTE|PAGADA|CONDONADA
     ?id_lector=N
     ?desde=YYYY-MM-DD  &hasta=YYYY-MM-DD
   ───────────────────────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { estado, id_lector, desde, hasta } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (estado && estado !== 'TODOS') {
      where += ' AND m.estado = ?';
      params.push(estado);
    }
    if (id_lector) {
      where += ' AND m.id_lector = ?';
      params.push(parseInt(id_lector, 10));
    }
    if (desde) {
      where += ' AND DATE(m.fecha_generacion) >= ?';
      params.push(desde);
    }
    if (hasta) {
      where += ' AND DATE(m.fecha_generacion) <= ?';
      params.push(hasta);
    }

    const [rows] = await pool.query(
      `SELECT m.*,
              CONCAT(p.nombres, ' ', p.apellidos) AS lector,
              lc.codigo_lector,
              pr.fecha_prestamo,
              GROUP_CONCAT(DISTINCT li.titulo SEPARATOR ', ') AS libros_prestamo
       FROM multa m
       JOIN lector  lc ON lc.id_lector  = m.id_lector
       JOIN persona p  ON p.id_persona  = lc.id_persona
       JOIN prestamo pr ON pr.id_prestamo = m.id_prestamo
       LEFT JOIN detalle_prestamo dp ON dp.id_prestamo = pr.id_prestamo
       LEFT JOIN ejemplar ej ON ej.id_ejemplar = dp.id_ejemplar
       LEFT JOIN libro li ON li.id_libro = ej.id_libro
       ${where}
       GROUP BY m.id_multa
       ORDER BY FIELD(m.estado,'PENDIENTE','CONDONADA','PAGADA'), m.fecha_generacion DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/multas/resumen
   Totales: pendiente, pagada, condonada y montos
   ───────────────────────────────────────────────────────────── */
router.get('/resumen', async (req, res, next) => {
  try {
    const [[resumen]] = await pool.query(
      `SELECT
        COUNT(*)                                                   AS total,
        SUM(estado = 'PENDIENTE')                                  AS total_pendientes,
        SUM(estado = 'PAGADA')                                     AS total_pagadas,
        SUM(estado = 'CONDONADA')                                  AS total_condonadas,
        COALESCE(SUM(CASE WHEN estado='PENDIENTE' THEN monto END),0) AS monto_pendiente,
        COALESCE(SUM(CASE WHEN estado='PAGADA'    THEN monto END),0) AS monto_cobrado,
        COALESCE(SUM(monto),0)                                     AS monto_total
       FROM multa`
    );
    res.json(resumen);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/multas
   Crear multa manualmente (concepto libre, monto, id_lector, id_prestamo)
   ───────────────────────────────────────────────────────────── */
router.post('/', async (req, res, next) => {
  try {
    const { id_lector, id_prestamo, concepto, monto } = req.body;
    if (!id_lector || !id_prestamo || !concepto || monto == null) {
      return res.status(400).json({ message: 'id_lector, id_prestamo, concepto y monto son requeridos.' });
    }
    if (parseFloat(monto) < 0) {
      return res.status(400).json({ message: 'El monto no puede ser negativo.' });
    }

    // Verificar que el lector exista
    const [[lc]] = await pool.query('SELECT id_lector FROM lector WHERE id_lector = ?', [id_lector]);
    if (!lc) return res.status(404).json({ message: 'Lector no encontrado.' });

    // Verificar que el préstamo exista y pertenezca al lector
    const [[pr]] = await pool.query(
      'SELECT id_prestamo FROM prestamo WHERE id_prestamo = ? AND id_lector = ?',
      [id_prestamo, id_lector]
    );
    if (!pr) return res.status(404).json({ message: 'Préstamo no encontrado para ese lector.' });

    const [r] = await pool.query(
      'INSERT INTO multa(id_lector, id_prestamo, concepto, monto) VALUES(?,?,?,?)',
      [id_lector, id_prestamo, concepto.trim(), parseFloat(monto)]
    );
    res.status(201).json({ message: 'Multa registrada correctamente.', id_multa: r.insertId });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/multas/:id/pagar
   ───────────────────────────────────────────────────────────── */
router.patch('/:id/pagar', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "UPDATE multa SET estado='PAGADA', fecha_pago=NOW() WHERE id_multa=? AND estado='PENDIENTE'",
      [req.params.id]
    );
    if (!r.affectedRows)
      return res.status(400).json({ message: 'La multa ya fue pagada/condonada o no existe.' });
    res.json({ message: 'Multa marcada como pagada.' });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/multas/:id/condonar
   ───────────────────────────────────────────────────────────── */
router.patch('/:id/condonar', async (req, res, next) => {
  try {
    const { motivo } = req.body;
    const [r] = await pool.query(
      `UPDATE multa
         SET estado    = 'CONDONADA',
             concepto  = CONCAT(concepto, ' [CONDONADA: ', COALESCE(?, 'Sin motivo'), ']'),
             fecha_pago = NOW()
       WHERE id_multa = ? AND estado = 'PENDIENTE'`,
      [motivo || null, req.params.id]
    );
    if (!r.affectedRows)
      return res.status(400).json({ message: 'La multa ya fue pagada/condonada o no existe.' });
    res.json({ message: 'Multa condonada.' });
  } catch (err) { next(err); }
});

module.exports = router;
