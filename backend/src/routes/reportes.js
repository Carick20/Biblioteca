const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* GET /api/reportes/dashboard */
router.get('/dashboard', async (req, res, next) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);

    const [[stats]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM libro           WHERE estado='ACTIVO')              AS total_libros,
        (SELECT COUNT(*) FROM ejemplar        WHERE estado='DISPONIBLE')          AS disponibles,
        (SELECT COUNT(*) FROM detalle_prestamo WHERE estado='ACTIVO')             AS prestamos_activos,
        (SELECT COUNT(*) FROM detalle_prestamo WHERE estado='ACTIVO'
                           AND fecha_devolucion_programada < ?)                   AS prestamos_vencidos,
        (SELECT COUNT(*) FROM multa           WHERE estado='PENDIENTE')           AS multas_pendientes,
        (SELECT COUNT(*) FROM lector          WHERE estado='ACTIVO')              AS lectores_activos,
        (SELECT COALESCE(SUM(monto),0) FROM multa WHERE estado='PENDIENTE')       AS monto_multas`,
      [hoy]
    );

    const [top_libros] = await pool.query(
      `SELECT l.titulo, COUNT(*) AS total_prestamos
       FROM detalle_prestamo d
       JOIN ejemplar e ON e.id_ejemplar = d.id_ejemplar
       JOIN libro l    ON l.id_libro    = e.id_libro
       GROUP BY l.id_libro
       ORDER BY total_prestamos DESC
       LIMIT 5`
    );

    const [inventario] = await pool.query(
      `SELECT estado, COUNT(*) AS cantidad FROM ejemplar GROUP BY estado`
    );

    res.json({ stats, top_libros, inventario });
  } catch (err) { next(err); }
});

/* GET /api/reportes/prestamos-por-mes */
router.get('/prestamos-por-mes', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(fecha_prestamo, '%Y-%m') AS mes, COUNT(*) AS total
       FROM prestamo
       WHERE fecha_prestamo >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY mes
       ORDER BY mes`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
