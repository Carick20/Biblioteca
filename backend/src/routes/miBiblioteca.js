/**
 * routes/miBiblioteca.js
 * ─────────────────────────────────────────────────────────────
 * Portal del lector: rutas autenticadas con token tipo 'lector'.
 * Permite ver el perfil propio, préstamos activos, historial y multas.
 * ─────────────────────────────────────────────────────────────
 */
const express = require('express');
const pool    = require('../config/database');
const { requireLector } = require('../middleware/auth');

const router = express.Router();
router.use(requireLector);   // ← bloquea tokens de admin

/* GET /api/mi-biblioteca/perfil */
router.get('/perfil', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lc.id_lector, lc.codigo_lector, lc.estado,
              lc.fecha_inscripcion, lc.fecha_vencimiento,
              p.nombres, p.apellidos, p.correo, p.telefono,
              p.tipo_documento, p.numero_documento,
              tl.nombre AS tipo_lector
       FROM lector lc
       JOIN persona     p  ON p.id_persona     = lc.id_persona
       JOIN tipo_lector tl ON tl.id_tipo_lector = lc.id_tipo_lector
       WHERE lc.id_lector = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Lector no encontrado.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/* GET /api/mi-biblioteca/prestamos — préstamos activos del lector */
router.get('/prestamos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id_detalle, d.fecha_devolucion_programada, d.estado AS estado_detalle,
              p.id_prestamo, p.fecha_prestamo,
              l.titulo, l.isbn,
              e.codigo_barras,
              (SELECT COUNT(*) FROM renovacion r WHERE r.id_detalle_prestamo = d.id_detalle) AS renovaciones,
              DATEDIFF(CURDATE(), d.fecha_devolucion_programada) AS dias_vencido
       FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       JOIN ejemplar e ON e.id_ejemplar  = d.id_ejemplar
       JOIN libro    l ON l.id_libro     = e.id_libro
       WHERE p.id_lector = ? AND d.estado = 'ACTIVO'
       ORDER BY d.fecha_devolucion_programada`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/mi-biblioteca/historial */
router.get('/historial', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id_detalle, d.fecha_devolucion_programada, d.estado AS estado_detalle,
              p.fecha_prestamo,
              l.titulo, e.codigo_barras,
              dv.fecha_devolucion
       FROM detalle_prestamo d
       JOIN prestamo   p  ON p.id_prestamo   = d.id_prestamo
       JOIN ejemplar   e  ON e.id_ejemplar   = d.id_ejemplar
       JOIN libro      l  ON l.id_libro      = e.id_libro
       LEFT JOIN devolucion dv ON dv.id_detalle_prestamo = d.id_detalle
       WHERE p.id_lector = ?
       ORDER BY p.fecha_prestamo DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/mi-biblioteca/multas */
router.get('/multas', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id_multa, m.concepto, m.monto, m.estado,
              m.fecha_generacion, m.fecha_pago,
              l.titulo
       FROM multa m
       JOIN prestamo       prs ON prs.id_prestamo = m.id_prestamo
       JOIN detalle_prestamo d ON d.id_prestamo   = prs.id_prestamo
       JOIN ejemplar        e  ON e.id_ejemplar   = d.id_ejemplar
       JOIN libro           l  ON l.id_libro      = e.id_libro
       WHERE m.id_lector = ?
       GROUP BY m.id_multa
       ORDER BY m.fecha_generacion DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
