const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/dashboard
   KPIs generales + top libros + inventario por estado
   ───────────────────────────────────────────────────────────── */
router.get('/dashboard', async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const [[stats]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM libro           WHERE estado='ACTIVO')              AS total_libros,
        (SELECT COUNT(*) FROM ejemplar        WHERE estado='DISPONIBLE')          AS disponibles,
        (SELECT COUNT(*) FROM ejemplar        WHERE estado != 'BAJA')             AS total_ejemplares,
        (SELECT COUNT(*) FROM detalle_prestamo WHERE estado='ACTIVO')             AS prestamos_activos,
        (SELECT COUNT(*) FROM detalle_prestamo WHERE estado='ACTIVO'
                           AND fecha_devolucion_programada < ?)                   AS prestamos_vencidos,
        (SELECT COUNT(*) FROM multa           WHERE estado='PENDIENTE')           AS multas_pendientes,
        (SELECT COUNT(*) FROM lector          WHERE estado='ACTIVO')              AS lectores_activos,
        (SELECT COALESCE(SUM(monto),0) FROM multa WHERE estado='PENDIENTE')       AS monto_multas,
        (SELECT COALESCE(SUM(monto),0) FROM multa WHERE estado='PAGADA')          AS monto_cobrado,
        (SELECT COUNT(*) FROM prestamo
         WHERE DATE(fecha_prestamo) = ?)                                          AS prestamos_hoy`,
      [hoy, hoy]
    );

    const [top_libros] = await pool.query(
      `SELECT l.titulo, l.portada_url,
              GROUP_CONCAT(DISTINCT CONCAT(a.nombres,' ',COALESCE(a.apellidos,''))) AS autores,
              COUNT(DISTINCT d.id_detalle) AS total_prestamos
       FROM detalle_prestamo d
       JOIN ejemplar e ON e.id_ejemplar = d.id_ejemplar
       JOIN libro l    ON l.id_libro    = e.id_libro
       LEFT JOIN libro_autor la ON la.id_libro = l.id_libro
       LEFT JOIN autor a ON a.id_autor = la.id_autor
       GROUP BY l.id_libro
       ORDER BY total_prestamos DESC
       LIMIT 8`
    );

    const [inventario] = await pool.query(
      `SELECT estado, COUNT(*) AS cantidad FROM ejemplar GROUP BY estado ORDER BY cantidad DESC`
    );

    const [ultimos_prestamos] = await pool.query(
      `SELECT p.id_prestamo,
              DATE_FORMAT(p.fecha_prestamo,'%d/%m/%Y %H:%i') AS fecha_prestamo,
              CONCAT(per.nombres,' ',per.apellidos) AS lector,
              lc.codigo_lector,
              GROUP_CONCAT(li.titulo SEPARATOR ', ') AS libros,
              COUNT(d.id_detalle) AS cantidad_libros
       FROM prestamo p
       JOIN lector  lc  ON lc.id_lector  = p.id_lector
       JOIN persona per ON per.id_persona = lc.id_persona
       JOIN detalle_prestamo d ON d.id_prestamo = p.id_prestamo
       JOIN ejemplar e ON e.id_ejemplar = d.id_ejemplar
       JOIN libro li ON li.id_libro = e.id_libro
       GROUP BY p.id_prestamo
       ORDER BY p.fecha_prestamo DESC
       LIMIT 10`
    );

    res.json({ stats, top_libros, inventario, ultimos_prestamos });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/prestamos-por-mes
   Préstamos agrupados por mes (últimos 12 meses)
   ───────────────────────────────────────────────────────────── */
router.get('/prestamos-por-mes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(fecha_prestamo, '%Y-%m') AS mes,
              DATE_FORMAT(fecha_prestamo, '%b %Y')  AS mes_label,
              COUNT(*) AS total
       FROM prestamo
       WHERE fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY mes, mes_label
       ORDER BY mes`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/multas-por-mes
   Multas generadas por mes (últimos 12 meses) + monto
   ───────────────────────────────────────────────────────────── */
router.get('/multas-por-mes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(fecha_generacion, '%Y-%m') AS mes,
              DATE_FORMAT(fecha_generacion, '%b %Y')  AS mes_label,
              COUNT(*)                                 AS total,
              COALESCE(SUM(monto), 0)                 AS monto_total,
              SUM(estado = 'PAGADA')                   AS pagadas,
              SUM(estado = 'PENDIENTE')                AS pendientes
       FROM multa
       WHERE fecha_generacion >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY mes, mes_label
       ORDER BY mes`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/prestamos-vencidos
   Lista detallada de préstamos activos vencidos
   ───────────────────────────────────────────────────────────── */
router.get('/prestamos-vencidos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id_detalle,
              d.fecha_devolucion_programada,
              DATEDIFF(CURDATE(), d.fecha_devolucion_programada) AS dias_vencido,
              p.id_prestamo,
              DATE_FORMAT(p.fecha_prestamo,'%d/%m/%Y') AS fecha_prestamo,
              CONCAT(per.nombres,' ',per.apellidos)    AS lector,
              per.correo,
              per.telefono,
              lc.codigo_lector,
              tl.nombre AS tipo_lector,
              pol.multa_por_dia,
              ROUND(DATEDIFF(CURDATE(), d.fecha_devolucion_programada) * pol.multa_por_dia, 2) AS multa_estimada,
              l.titulo,
              e.codigo_barras,
              (SELECT COUNT(*) FROM renovacion r WHERE r.id_detalle_prestamo = d.id_detalle) AS renovaciones
       FROM detalle_prestamo d
       JOIN prestamo p        ON p.id_prestamo      = d.id_prestamo
       JOIN ejemplar e        ON e.id_ejemplar       = d.id_ejemplar
       JOIN libro l           ON l.id_libro          = e.id_libro
       JOIN lector lc         ON lc.id_lector        = p.id_lector
       JOIN persona per       ON per.id_persona      = lc.id_persona
       JOIN tipo_lector tl    ON tl.id_tipo_lector   = lc.id_tipo_lector
       JOIN politica_prestamo pol ON pol.id_tipo_lector = lc.id_tipo_lector
       WHERE d.estado = 'ACTIVO'
         AND d.fecha_devolucion_programada < CURDATE()
       ORDER BY dias_vencido DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/lectores-con-multas
   Lectores que tienen multas pendientes con detalle
   ───────────────────────────────────────────────────────────── */
router.get('/lectores-con-multas', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lc.id_lector,
              lc.codigo_lector,
              CONCAT(per.nombres,' ',per.apellidos) AS nombre,
              per.correo,
              per.telefono,
              tl.nombre AS tipo_lector,
              COUNT(m.id_multa)              AS total_multas,
              SUM(m.monto)                   AS monto_total,
              MAX(m.fecha_generacion)        AS ultima_multa
       FROM multa m
       JOIN lector  lc  ON lc.id_lector  = m.id_lector
       JOIN persona per ON per.id_persona = lc.id_persona
       JOIN tipo_lector tl ON tl.id_tipo_lector = lc.id_tipo_lector
       WHERE m.estado = 'PENDIENTE'
       GROUP BY lc.id_lector
       ORDER BY monto_total DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/lectores-mas-activos
   Top lectores por cantidad de préstamos
   ───────────────────────────────────────────────────────────── */
router.get('/lectores-mas-activos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT lc.id_lector,
              lc.codigo_lector,
              CONCAT(per.nombres,' ',per.apellidos) AS nombre,
              tl.nombre AS tipo_lector,
              COUNT(DISTINCT p.id_prestamo) AS total_prestamos,
              SUM(CASE WHEN d.estado='ACTIVO' THEN 1 ELSE 0 END) AS prestamos_activos,
              MAX(p.fecha_prestamo) AS ultimo_prestamo
       FROM lector lc
       JOIN persona per ON per.id_persona = lc.id_persona
       JOIN tipo_lector tl ON tl.id_tipo_lector = lc.id_tipo_lector
       LEFT JOIN prestamo p ON p.id_lector = lc.id_lector
       LEFT JOIN detalle_prestamo d ON d.id_prestamo = p.id_prestamo
       WHERE lc.estado = 'ACTIVO'
       GROUP BY lc.id_lector
       HAVING total_prestamos > 0
       ORDER BY total_prestamos DESC
       LIMIT 10`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/reportes/historial-completo
   Parámetros: ?desde &hasta &id_lector &estado &page &limit
   ───────────────────────────────────────────────────────────── */
router.get('/historial-completo', async (req, res, next) => {
  try {
    const { desde, hasta, id_lector, estado, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let where = 'WHERE 1=1';
    const params = [];

    if (desde) { where += ' AND DATE(p.fecha_prestamo) >= ?'; params.push(desde); }
    if (hasta) { where += ' AND DATE(p.fecha_prestamo) <= ?'; params.push(hasta); }
    if (id_lector) { where += ' AND lc.id_lector = ?'; params.push(parseInt(id_lector, 10)); }
    if (estado && estado !== 'TODOS') { where += ' AND d.estado = ?'; params.push(estado); }

    const [rows] = await pool.query(
      `SELECT d.id_detalle,
              d.fecha_devolucion_programada,
              d.estado AS estado_detalle,
              p.id_prestamo,
              DATE_FORMAT(p.fecha_prestamo,'%d/%m/%Y %H:%i') AS fecha_prestamo,
              CONCAT(per.nombres,' ',per.apellidos) AS lector,
              lc.codigo_lector,
              tl.nombre AS tipo_lector,
              l.titulo,
              e.codigo_barras,
              dv.fecha_devolucion,
              dv.estado_ejemplar,
              dv.observaciones AS obs_devolucion,
              DATEDIFF(COALESCE(DATE(dv.fecha_devolucion), CURDATE()), d.fecha_devolucion_programada) AS dias_diferencia,
              (SELECT COUNT(*) FROM renovacion r WHERE r.id_detalle_prestamo = d.id_detalle) AS renovaciones,
              (SELECT SUM(mt.monto) FROM multa mt WHERE mt.id_prestamo = p.id_prestamo
               AND mt.id_lector = lc.id_lector) AS multas_prestamo
       FROM detalle_prestamo d
       JOIN prestamo p  ON p.id_prestamo  = d.id_prestamo
       JOIN ejemplar e  ON e.id_ejemplar  = d.id_ejemplar
       JOIN libro l     ON l.id_libro     = e.id_libro
       JOIN lector lc   ON lc.id_lector   = p.id_lector
       JOIN persona per ON per.id_persona  = lc.id_persona
       JOIN tipo_lector tl ON tl.id_tipo_lector = lc.id_tipo_lector
       LEFT JOIN devolucion dv ON dv.id_detalle_prestamo = d.id_detalle
       ${where}
       ORDER BY p.fecha_prestamo DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit, 10), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM detalle_prestamo d
       JOIN prestamo p  ON p.id_prestamo  = d.id_prestamo
       JOIN lector lc   ON lc.id_lector   = p.id_lector
       ${where.replace('WHERE 1=1', 'WHERE 1=1')}`,
      params
    );

    res.json({ data: rows, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) { next(err); }
});

module.exports = router;
