/**
 * routes/publico.js
 * Rutas públicas — NO requieren JWT.
 * Cualquier visitante puede consultarlas.
 */
const express = require('express');
const pool    = require('../config/database');

const router = express.Router();

/* GET /api/publico/stats — estadísticas generales */
router.get('/stats', async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM libro   WHERE estado='ACTIVO')       AS total_libros,
        (SELECT COUNT(*) FROM autor)                               AS total_autores,
        (SELECT COUNT(*) FROM lector  WHERE estado='ACTIVO')       AS total_lectores,
        (SELECT COUNT(*) FROM ejemplar WHERE estado='DISPONIBLE')  AS disponibles`
    );
    res.json(stats);
  } catch (err) { next(err); }
});

/* GET /api/publico/libros?q=&page=1&limit=12 — catálogo público */
router.get('/libros', async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 12, categoria = '' } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const like   = `%${q}%`;
    const likeCat = `%${categoria}%`;

    const [libros] = await pool.query(
      `SELECT l.id_libro, l.titulo, l.isbn, l.anio_publicacion, l.idioma, l.descripcion,
              l.portada_url,
              ed.nombre AS editorial,
              GROUP_CONCAT(DISTINCT (a.nombres || ' ' || COALESCE(a.apellidos,''))) AS autores,
              GROUP_CONCAT(DISTINCT c.nombre) AS categorias,
              SUM(CASE WHEN e.estado='DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
              COUNT(DISTINCT e.id_ejemplar) AS total_ejemplares
       FROM libro l
       LEFT JOIN editorial      ed ON ed.id_editorial  = l.id_editorial
       LEFT JOIN libro_autor    la ON la.id_libro       = l.id_libro
       LEFT JOIN autor          a  ON a.id_autor        = la.id_autor
       LEFT JOIN libro_categoria lc ON lc.id_libro      = l.id_libro
       LEFT JOIN categoria      c  ON c.id_categoria    = lc.id_categoria
       LEFT JOIN ejemplar       e  ON e.id_libro        = l.id_libro AND e.estado != 'BAJA'
       WHERE l.estado = 'ACTIVO'
         AND (l.titulo LIKE ? OR l.isbn LIKE ?
              OR a.nombres LIKE ? OR a.apellidos LIKE ?)
         AND (? = '' OR c.nombre LIKE ?)
       GROUP BY l.id_libro
       ORDER BY l.titulo
       LIMIT ? OFFSET ?`,
      [like, like, like, like, categoria, likeCat, parseInt(limit, 10), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT l.id_libro) AS total
       FROM libro l
       LEFT JOIN libro_autor    la ON la.id_libro = l.id_libro
       LEFT JOIN autor          a  ON a.id_autor  = la.id_autor
       LEFT JOIN libro_categoria lc ON lc.id_libro = l.id_libro
       LEFT JOIN categoria      c  ON c.id_categoria = lc.id_categoria
       WHERE l.estado = 'ACTIVO'
         AND (l.titulo LIKE ? OR l.isbn LIKE ?
              OR a.nombres LIKE ? OR a.apellidos LIKE ?)
         AND (? = '' OR c.nombre LIKE ?)`,
      [like, like, like, like, categoria, likeCat]
    );

    res.json({ data: libros, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) { next(err); }
});

/* GET /api/publico/libros/:id — detalle de un libro */
router.get('/libros/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*,
              ed.nombre AS editorial,
              GROUP_CONCAT(DISTINCT (a.nombres || ' ' || COALESCE(a.apellidos,''))) AS autores,
              GROUP_CONCAT(DISTINCT c.nombre) AS categorias,
              SUM(CASE WHEN e.estado='DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
              COUNT(DISTINCT e.id_ejemplar) AS total_ejemplares
       FROM libro l
       LEFT JOIN editorial      ed ON ed.id_editorial  = l.id_editorial
       LEFT JOIN libro_autor    la ON la.id_libro       = l.id_libro
       LEFT JOIN autor          a  ON a.id_autor        = la.id_autor
       LEFT JOIN libro_categoria lc ON lc.id_libro      = l.id_libro
       LEFT JOIN categoria      c  ON c.id_categoria    = lc.id_categoria
       LEFT JOIN ejemplar       e  ON e.id_libro        = l.id_libro AND e.estado != 'BAJA'
       WHERE l.id_libro = ? AND l.estado = 'ACTIVO'
       GROUP BY l.id_libro`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Libro no encontrado.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/* GET /api/publico/categorias */
router.get('/categorias', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id_categoria, c.nombre, COUNT(DISTINCT lc.id_libro) AS total
       FROM categoria c
       LEFT JOIN libro_categoria lc ON lc.id_categoria = c.id_categoria
       LEFT JOIN libro l ON l.id_libro = lc.id_libro AND l.estado = 'ACTIVO'
       WHERE c.estado = 'ACTIVO'
       GROUP BY c.id_categoria
       ORDER BY c.nombre`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* GET /api/publico/destacados — libros más prestados */
router.get('/destacados', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.id_libro, l.titulo, l.anio_publicacion,
              l.portada_url,
              ed.nombre AS editorial,
              GROUP_CONCAT(DISTINCT (a.nombres || ' ' || COALESCE(a.apellidos,''))) AS autores,
              GROUP_CONCAT(DISTINCT c.nombre) AS categorias,
              SUM(CASE WHEN e.estado='DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles,
              COUNT(DISTINCT dp.id_detalle) AS veces_prestado
       FROM libro l
       LEFT JOIN editorial      ed ON ed.id_editorial  = l.id_editorial
       LEFT JOIN libro_autor    la ON la.id_libro       = l.id_libro
       LEFT JOIN autor          a  ON a.id_autor        = la.id_autor
       LEFT JOIN libro_categoria lc ON lc.id_libro      = l.id_libro
       LEFT JOIN categoria      c  ON c.id_categoria    = lc.id_categoria
       LEFT JOIN ejemplar       e  ON e.id_libro        = l.id_libro
       LEFT JOIN detalle_prestamo dp ON dp.id_ejemplar  = e.id_ejemplar
       WHERE l.estado = 'ACTIVO'
       GROUP BY l.id_libro
       ORDER BY veces_prestado DESC, l.titulo
       LIMIT 6`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
