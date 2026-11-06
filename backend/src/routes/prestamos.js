const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* GET /api/prestamos  — activos */
router.get('/', async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT d.id_detalle, d.fecha_devolucion_programada, d.estado AS estado_detalle,
              p.id_prestamo, p.fecha_prestamo,
              (per.nombres || ' ' || per.apellidos) AS lector,
              lc.codigo_lector,
              l.titulo, e.codigo_barras,
              (SELECT COUNT(*) FROM renovacion r WHERE r.id_detalle_prestamo = d.id_detalle) AS renovaciones,
              cast(julianday('now') - julianday(d.fecha_devolucion_programada) as integer) AS dias_vencido
       FROM detalle_prestamo d
       JOIN prestamo p  ON p.id_prestamo  = d.id_prestamo
       JOIN ejemplar e  ON e.id_ejemplar  = d.id_ejemplar
       JOIN libro l     ON l.id_libro     = e.id_libro
       JOIN lector lc   ON lc.id_lector   = p.id_lector
       JOIN persona per ON per.id_persona  = lc.id_persona
       WHERE d.estado = 'ACTIVO'
       ORDER BY d.fecha_devolucion_programada`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/prestamos/historial */
router.get('/historial', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id_detalle, d.fecha_devolucion_programada, d.estado AS estado_detalle,
              p.fecha_prestamo,
              (per.nombres || ' ' || per.apellidos) AS lector,
              l.titulo, e.codigo_barras,
              dv.fecha_devolucion
       FROM detalle_prestamo d
       JOIN prestamo p  ON p.id_prestamo  = d.id_prestamo
       JOIN ejemplar e  ON e.id_ejemplar  = d.id_ejemplar
       JOIN libro l     ON l.id_libro     = e.id_libro
       JOIN lector lc   ON lc.id_lector   = p.id_lector
       JOIN persona per ON per.id_persona  = lc.id_persona
       LEFT JOIN devolucion dv ON dv.id_detalle_prestamo = d.id_detalle
       ORDER BY p.fecha_prestamo DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* POST /api/prestamos  — nuevo préstamo */
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id_lector, id_ejemplares } = req.body;

    if (!id_lector || !Array.isArray(id_ejemplares) || !id_ejemplares.length) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Lector y al menos un ejemplar son requeridos.' });
    }

    // Validar lector + política
    const [[lc]] = await conn.query(
      `SELECT lc.estado, lc.fecha_vencimiento,
              pol.max_libros, pol.dias_prestamo
       FROM lector lc
       JOIN politica_prestamo pol ON pol.id_tipo_lector = lc.id_tipo_lector
       WHERE lc.id_lector = ?`,
      [id_lector]
    );
    if (!lc)                     throw Object.assign(new Error('Lector no encontrado.'),              { status: 404 });
    if (lc.estado !== 'ACTIVO')  throw Object.assign(new Error('El lector no está activo.'),          { status: 400 });
    const hoy = new Date().toISOString().slice(0, 10);
    if (lc.fecha_vencimiento && lc.fecha_vencimiento < hoy)
      throw Object.assign(new Error('La inscripción del lector está vencida.'), { status: 400 });

    // Libros activos del lector
    const [[{ en_uso }]] = await conn.query(
      `SELECT COUNT(*) AS en_uso FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       WHERE p.id_lector = ? AND d.estado = 'ACTIVO'`,
      [id_lector]
    );
    if (en_uso + id_ejemplares.length > lc.max_libros)
      throw Object.assign(
        new Error(`Supera el límite de ${lc.max_libros} libros (tiene ${en_uso} en uso).`),
        { status: 400 }
      );

    // Obtener bibliotecario del usuario logueado (fallback a 1)
    const [[bib]] = await conn.query(
      `SELECT b.id_bibliotecario
       FROM usuario u
       JOIN empleado e     ON e.id_persona    = u.id_persona
       JOIN bibliotecario b ON b.id_empleado  = e.id_empleado
       WHERE u.id_usuario = ?`,
      [req.user.id]
    );
    const id_bib = bib ? bib.id_bibliotecario : 1;

    // Crear cabecera préstamo
    const [pr] = await conn.query(
      'INSERT INTO prestamo(id_lector, id_bibliotecario) VALUES(?,?)',
      [id_lector, id_bib]
    );
    const id_prestamo = pr.insertId;
    const vence = new Date(Date.now() + lc.dias_prestamo * 86400000).toISOString().slice(0, 10);

    // Insertar detalles
    for (const id_ej of id_ejemplares) {
      const [[ej]] = await conn.query(
        'SELECT estado FROM ejemplar WHERE id_ejemplar = ?', [id_ej]);
      if (!ej || ej.estado !== 'DISPONIBLE')
        throw Object.assign(new Error(`Ejemplar ${id_ej} no está disponible.`), { status: 400 });
      await conn.query(
        'INSERT INTO detalle_prestamo(id_prestamo, id_ejemplar, fecha_devolucion_programada) VALUES(?,?,?)',
        [id_prestamo, id_ej, vence]
      );
      await conn.query("UPDATE ejemplar SET estado='PRESTADO' WHERE id_ejemplar=?", [id_ej]);
    }

    await conn.commit(); conn.release();
    res.status(201).json({ message: `Préstamo registrado. Vence el ${vence}.`, id_prestamo, vence });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

/* POST /api/prestamos/devolver/:id_detalle */
router.post('/devolver/:id_detalle', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { estado_ejemplar = 'DISPONIBLE' } = req.body;
    const id_detalle = parseInt(req.params.id_detalle, 10);

    const [[det]] = await conn.query(
      `SELECT d.*, p.id_lector, pol.multa_por_dia
       FROM detalle_prestamo d
       JOIN prestamo p          ON p.id_prestamo      = d.id_prestamo
       JOIN lector lc           ON lc.id_lector        = p.id_lector
       JOIN politica_prestamo pol ON pol.id_tipo_lector = lc.id_tipo_lector
       WHERE d.id_detalle = ?`,
      [id_detalle]
    );
    if (!det)                    { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Detalle no encontrado.' }); }
    if (det.estado !== 'ACTIVO') { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'Este ejemplar ya fue devuelto.' }); }

    const [[bib]] = await conn.query(
      `SELECT b.id_bibliotecario FROM usuario u
       JOIN empleado emp      ON emp.id_persona   = u.id_persona
       JOIN bibliotecario b   ON b.id_empleado    = emp.id_empleado
       WHERE u.id_usuario = ?`,
      [req.user.id]
    );
    const id_bib = bib ? bib.id_bibliotecario : 1;

    await conn.query(
      'INSERT INTO devolucion(id_detalle_prestamo, id_bibliotecario, estado_ejemplar) VALUES(?,?,?)',
      [id_detalle, id_bib, estado_ejemplar]
    );

    const estadoDetalle = estado_ejemplar === 'DISPONIBLE' ? 'DEVUELTO' : estado_ejemplar;
    await conn.query('UPDATE detalle_prestamo SET estado=? WHERE id_detalle=?',   [estadoDetalle, id_detalle]);
    await conn.query('UPDATE ejemplar SET estado=? WHERE id_ejemplar=?',          [estado_ejemplar, det.id_ejemplar]);

    // Multa por retraso (cálculo en JS para evitar funciones de fecha SQL)
    const diasTarde = Math.floor(
      (Date.now() - new Date(det.fecha_devolucion_programada).getTime()) / 86400000
    );
    let multaMsg = '';
    if (diasTarde > 0) {
      const monto = diasTarde * parseFloat(det.multa_por_dia);
      await conn.query(
        'INSERT INTO multa(id_lector, id_prestamo, concepto, monto) VALUES(?,?,?,?)',
        [det.id_lector, det.id_prestamo, `Retraso de ${diasTarde} día(s)`, monto]
      );
      multaMsg = ` Se generó multa de S/ ${monto.toFixed(2)}.`;
    }

    // Cerrar préstamo si no quedan detalles activos
    const [[{ pendientes }]] = await conn.query(
      "SELECT COUNT(*) AS pendientes FROM detalle_prestamo WHERE id_prestamo=? AND estado='ACTIVO'",
      [det.id_prestamo]
    );
    if (pendientes === 0) {
      await conn.query("UPDATE prestamo SET estado='DEVUELTO' WHERE id_prestamo=?", [det.id_prestamo]);
    }

    await conn.commit(); conn.release();
    res.json({ message: `Devolución registrada.${multaMsg}` });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

/* POST /api/prestamos/renovar/:id_detalle */
router.post('/renovar/:id_detalle', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id_detalle = parseInt(req.params.id_detalle, 10);

    const [[det]] = await conn.query(
      `SELECT d.*, pol.max_renovaciones, pol.dias_renovacion
       FROM detalle_prestamo d
       JOIN prestamo p          ON p.id_prestamo      = d.id_prestamo
       JOIN lector lc           ON lc.id_lector        = p.id_lector
       JOIN politica_prestamo pol ON pol.id_tipo_lector = lc.id_tipo_lector
       WHERE d.id_detalle = ?`,
      [id_detalle]
    );
    if (!det)                    { await conn.rollback(); conn.release(); return res.status(404).json({ message: 'Detalle no encontrado.' }); }
    if (det.estado !== 'ACTIVO') { await conn.rollback(); conn.release(); return res.status(400).json({ message: 'El préstamo no está activo.' }); }

    const hoy = new Date().toISOString().slice(0, 10);
    if (det.fecha_devolucion_programada < hoy) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'No se puede renovar un préstamo vencido.' });
    }

    const [[{ count }]] = await conn.query(
      'SELECT COUNT(*) AS count FROM renovacion WHERE id_detalle_prestamo = ?', [id_detalle]);
    if (count >= det.max_renovaciones) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: `Se alcanzó el máximo de ${det.max_renovaciones} renovaciones.` });
    }

    const nueva = new Date(
      new Date(det.fecha_devolucion_programada).getTime() + det.dias_renovacion * 86400000
    ).toISOString().slice(0, 10);

    await conn.query(
      'INSERT INTO renovacion(id_detalle_prestamo, fecha_devolucion_anterior, nueva_fecha_devolucion) VALUES(?,?,?)',
      [id_detalle, det.fecha_devolucion_programada, nueva]
    );
    await conn.query(
      'UPDATE detalle_prestamo SET fecha_devolucion_programada=? WHERE id_detalle=?',
      [nueva, id_detalle]
    );

    await conn.commit(); conn.release();
    res.json({ message: `Préstamo renovado hasta el ${nueva}.`, nueva_fecha: nueva });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

module.exports = router;
