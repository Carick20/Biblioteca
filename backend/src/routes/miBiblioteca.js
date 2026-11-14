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
    // Query simplificada: obtiene el título del libro a través del préstamo
    // sin depender de un JOIN a detalle_prestamo que puede fallar
    // si hay multas sin detalle asociado.
    const [rows] = await pool.query(
      `SELECT m.id_multa, m.concepto, m.monto, m.estado,
              m.fecha_generacion, m.fecha_pago,
              COALESCE(
                (SELECT l.titulo
                 FROM detalle_prestamo d
                 JOIN ejemplar e ON e.id_ejemplar = d.id_ejemplar
                 JOIN libro    l ON l.id_libro    = e.id_libro
                 WHERE d.id_prestamo = m.id_prestamo
                 LIMIT 1),
                '—'
              ) AS titulo
       FROM multa m
       WHERE m.id_lector = ?
       ORDER BY m.fecha_generacion DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* POST /api/mi-biblioteca/solicitar-prestamo
   Body: { id_libro: number }
   Busca un ejemplar DISPONIBLE del libro, aplica las reglas de negocio
   (multas pendientes, préstamos vencidos, límite por tipo de lector)
   y registra el préstamo usando el bibliotecario de sistema (id 1). */
router.post('/solicitar-prestamo', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id_libro } = req.body;
    const id_lector = req.user.id;

    if (!id_libro) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'El campo id_libro es requerido.' });
    }

    // 1. Validar lector + política
    const [[lc]] = await conn.query(
      `SELECT lc.estado, lc.fecha_vencimiento,
              pol.max_libros, pol.dias_prestamo
       FROM lector lc
       JOIN politica_prestamo pol ON pol.id_tipo_lector = lc.id_tipo_lector
       WHERE lc.id_lector = ?`,
      [id_lector]
    );
    if (!lc) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: 'Lector no encontrado.' });
    }
    if (lc.estado !== 'ACTIVO') {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Tu cuenta de lector no está activa.' });
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (lc.fecha_vencimiento && lc.fecha_vencimiento < hoy) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Tu inscripción está vencida. Renuévala en biblioteca.' });
    }

    // 2. Sin multas pendientes
    const [[{ multas_pendientes }]] = await conn.query(
      `SELECT COUNT(*) AS multas_pendientes FROM multa WHERE id_lector = ? AND estado = 'PENDIENTE'`,
      [id_lector]
    );
    if (multas_pendientes > 0) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Tienes multas pendientes. Regulariza tu situación en biblioteca.' });
    }

    // 3. Sin préstamos vencidos
    const [[{ prestamos_vencidos }]] = await conn.query(
      `SELECT COUNT(*) AS prestamos_vencidos
       FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       WHERE p.id_lector = ? AND d.estado = 'ACTIVO' AND d.fecha_devolucion_programada < CURDATE()`,
      [id_lector]
    );
    if (prestamos_vencidos > 0) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Tienes préstamos vencidos sin devolver. Acércate a biblioteca.' });
    }

    // 4. Límite de libros
    const [[{ en_uso }]] = await conn.query(
      `SELECT COUNT(*) AS en_uso FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       WHERE p.id_lector = ? AND d.estado = 'ACTIVO'`,
      [id_lector]
    );
    if (en_uso >= lc.max_libros) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `Ya tienes ${en_uso} libro(s) en préstamo (límite: ${lc.max_libros}).` });
    }

    // 5. Buscar un ejemplar DISPONIBLE del libro
    const [[ej]] = await conn.query(
      `SELECT id_ejemplar, codigo_barras FROM ejemplar
       WHERE id_libro = ? AND estado = 'DISPONIBLE'
       LIMIT 1`,
      [id_libro]
    );
    if (!ej) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'No hay ejemplares disponibles de este libro en este momento.' });
    }

    // 6. Crear préstamo (bibliotecario de sistema = 1)
    const [pr] = await conn.query(
      'INSERT INTO prestamo(id_lector, id_bibliotecario) VALUES(?, 1)',
      [id_lector]
    );
    const id_prestamo = pr.insertId;
    const vence = new Date(Date.now() + lc.dias_prestamo * 86400000).toISOString().slice(0, 10);

    await conn.query(
      'INSERT INTO detalle_prestamo(id_prestamo, id_ejemplar, fecha_devolucion_programada) VALUES(?,?,?)',
      [id_prestamo, ej.id_ejemplar, vence]
    );
    await conn.query(
      "UPDATE ejemplar SET estado = 'PRESTADO' WHERE id_ejemplar = ?",
      [ej.id_ejemplar]
    );

    await conn.commit(); conn.release();
    res.status(201).json({
      message: `Préstamo registrado. Devuelve el libro antes del ${vence}.`,
      id_prestamo,
      vence,
      codigo_barras: ej.codigo_barras,
    });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

module.exports = router;
