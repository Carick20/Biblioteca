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
              CONCAT(p.nombres, ' ', p.apellidos) AS nombre_completo,
              t.nombre AS tipo_lector,
              (SELECT COUNT(*) FROM multa m WHERE m.id_lector = lc.id_lector AND m.estado = 'PENDIENTE') AS multas_pendientes,
              (SELECT COUNT(*) FROM detalle_prestamo d JOIN prestamo p2 ON p2.id_prestamo = d.id_prestamo WHERE p2.id_lector = lc.id_lector AND d.estado = 'ACTIVO' AND d.fecha_devolucion_programada < CURDATE()) AS prestamos_vencidos
       FROM lector lc
       JOIN persona    p ON p.id_persona     = lc.id_persona
       JOIN tipo_lector t ON t.id_tipo_lector = lc.id_tipo_lector
       ORDER BY p.apellidos, p.nombres`
    );
    const enriched = rows.map(r => {
      const apto = r.estado === 'ACTIVO' && r.multas_pendientes === 0 && r.prestamos_vencidos === 0;
      return {
        ...r,
        es_apto: apto,
        motivo_no_apto: r.estado !== 'ACTIVO' ? 'Inactivo' : r.multas_pendientes > 0 ? 'Multas pendientes' : r.prestamos_vencidos > 0 ? 'Préstamos vencidos' : null
      };
    });
    res.json(enriched);
  } catch (err) { next(err); }
});

/* GET /api/lectores/:id/actividad */
router.get('/:id/actividad', async (req, res, next) => {
  try {
    const id_lector = req.params.id;

    const [[lector]] = await pool.query(
      `SELECT lc.*, CONCAT(p.nombres, ' ', p.apellidos) AS nombre_completo,
              p.tipo_documento, p.numero_documento, p.correo, p.telefono, p.direccion, t.nombre AS tipo_lector
       FROM lector lc
       JOIN persona p ON p.id_persona = lc.id_persona
       JOIN tipo_lector t ON t.id_tipo_lector = lc.id_tipo_lector
       WHERE lc.id_lector = ?`,
      [id_lector]
    );
    if (!lector) return res.status(404).json({ message: 'Lector no encontrado.' });

    const [multasPendientes] = await pool.query(
      `SELECT * FROM multa WHERE id_lector = ? AND estado = 'PENDIENTE'`,
      [id_lector]
    );

    const [prestamosVencidos] = await pool.query(
      `SELECT d.*, l.titulo, DATEDIFF(CURDATE(), d.fecha_devolucion_programada) AS dias_vencido
       FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       JOIN ejemplar e ON e.id_ejemplar = d.id_ejemplar
       JOIN libro l ON l.id_libro = e.id_libro
       WHERE p.id_lector = ? AND d.estado = 'ACTIVO' AND d.fecha_devolucion_programada < CURDATE()`,
      [id_lector]
    );

    const [[politica]] = await pool.query(
      `SELECT multa_por_dia FROM politica_prestamo WHERE id_tipo_lector = ?`,
      [lector.id_tipo_lector]
    );
    const tarifaDiaria = politica ? parseFloat(politica.multa_por_dia) : 1.00;

    let montoMultasPendientes = multasPendientes.reduce((acc, m) => acc + parseFloat(m.monto), 0);
    let moraEstimadaVencidos = prestamosVencidos.reduce((acc, pv) => acc + (pv.dias_vencido * tarifaDiaria), 0);
    let deudaTotal = montoMultasPendientes + moraEstimadaVencidos;

    let esApto = multasPendientes.length === 0 && prestamosVencidos.length === 0 && lector.estado === 'ACTIVO';
    let motivoBloqueo = '';
    if (!esApto) {
      const razones = [];
      if (lector.estado !== 'ACTIVO') razones.push(`Lector en estado ${lector.estado}`);
      if (multasPendientes.length > 0) razones.push(`${multasPendientes.length} multa(s) pendiente(s)`);
      if (prestamosVencidos.length > 0) razones.push(`${prestamosVencidos.length} préstamo(s) vencido(s)`);
      motivoBloqueo = razones.join(', ');
    }

    const [[{ total_historicos }]] = await pool.query(
      `SELECT COUNT(DISTINCT p.id_prestamo) AS total_historicos FROM prestamo p WHERE p.id_lector = ?`,
      [id_lector]
    );
    const [[{ activos_actuales }]] = await pool.query(
      `SELECT COUNT(*) AS activos_actuales FROM detalle_prestamo d JOIN prestamo p ON p.id_prestamo = d.id_prestamo WHERE p.id_lector = ? AND d.estado = 'ACTIVO'`,
      [id_lector]
    );
    const [[resDev]] = await pool.query(
      `SELECT 
         SUM(CASE WHEN dv.fecha_devolucion <= d.fecha_devolucion_programada THEN 1 ELSE 0 END) AS devueltos_a_tiempo,
         SUM(CASE WHEN dv.fecha_devolucion > d.fecha_devolucion_programada THEN 1 ELSE 0 END) AS devueltos_con_atraso
       FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       JOIN devolucion dv ON dv.id_detalle_prestamo = d.id_detalle
       WHERE p.id_lector = ?`,
      [id_lector]
    );

    const [actividadPrestamos] = await pool.query(
      `SELECT 'PRESTAMO' AS tipo, p.fecha_prestamo AS fecha, CONCAT('Préstamo del libro: ', l.titulo, ' (', e.codigo_barras, ')') AS descripcion, NULL AS monto
       FROM detalle_prestamo d
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       JOIN ejemplar e ON e.id_ejemplar = d.id_ejemplar
       JOIN libro l ON l.id_libro = e.id_libro
       WHERE p.id_lector = ?`,
      [id_lector]
    );

    const [actividadDevoluciones] = await pool.query(
      `SELECT 'DEVOLUCION' AS tipo, dv.fecha_devolucion AS fecha, CONCAT('Devolución de ejemplar (Estado: ', dv.estado_ejemplar, ')') AS descripcion, NULL AS monto
       FROM devolucion dv
       JOIN detalle_prestamo d ON d.id_detalle = dv.id_detalle_prestamo
       JOIN prestamo p ON p.id_prestamo = d.id_prestamo
       WHERE p.id_lector = ?`,
      [id_lector]
    );

    const [actividadMultas] = await pool.query(
      `SELECT CASE WHEN estado = 'PAGADA' THEN 'MULTA_PAGADA' ELSE 'MULTA_PENDIENTE' END AS tipo, fecha_generacion AS fecha, CONCAT('Multa: ', concepto) AS descripcion, monto
       FROM multa
       WHERE id_lector = ?`,
      [id_lector]
    );

    const historialCronologico = [...actividadPrestamos, ...actividadDevoluciones, ...actividadMultas]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({
      lector,
      estado_solvencia: esApto ? 'Apto' : 'No apto / Bloqueado',
      motivo_bloqueo: motivoBloqueo || 'Ninguno',
      metricas: {
        total_historicos: total_historicos || 0,
        activos_actuales: activos_actuales || 0,
        devueltos_a_tiempo: resDev?.devueltos_a_tiempo || 0,
        devueltos_con_atraso: resDev?.devueltos_con_atraso || 0,
        deuda_total: deudaTotal.toFixed(2)
      },
      historial: historialCronologico
    });
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
