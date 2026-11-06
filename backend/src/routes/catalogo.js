const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* ── Autores ──────────────────────────────────────────────── */
router.get('/autores', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM autor ORDER BY apellidos, nombres');
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/autores', async (req, res, next) => {
  try {
    const { nombres, apellidos, nacionalidad, biografia } = req.body;
    if (!nombres) return res.status(400).json({ message: 'El nombre es requerido.' });
    const [r] = await pool.query(
      'INSERT INTO autor(nombres, apellidos, nacionalidad, biografia) VALUES(?,?,?,?)',
      [nombres.trim(), apellidos || '', nacionalidad || null, biografia || null]
    );
    res.status(201).json({ message: 'Autor registrado.', id_autor: r.insertId });
  } catch (err) { next(err); }
});

/* ── Editoriales ─────────────────────────────────────────── */
router.get('/editoriales', async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM editorial WHERE estado='ACTIVO' ORDER BY nombre");
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/editoriales', async (req, res, next) => {
  try {
    const { nombre, pais, telefono, correo } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es requerido.' });
    const [r] = await pool.query(
      'INSERT INTO editorial(nombre, pais, telefono, correo) VALUES(?,?,?,?)',
      [nombre.trim(), pais || null, telefono || null, correo || null]
    );
    res.status(201).json({ message: 'Editorial registrada.', id_editorial: r.insertId });
  } catch (err) { next(err); }
});

/* ── Categorías ──────────────────────────────────────────── */
router.get('/categorias', async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categoria WHERE estado='ACTIVO' ORDER BY nombre");
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/categorias', async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es requerido.' });
    const [r] = await pool.query(
      'INSERT INTO categoria(nombre, descripcion) VALUES(?,?)',
      [nombre.trim(), descripcion || null]
    );
    res.status(201).json({ message: 'Categoría registrada.', id_categoria: r.insertId });
  } catch (err) { next(err); }
});

/* ── Tipos de lector ─────────────────────────────────────── */
router.get('/tipos-lector', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, p.max_libros, p.dias_prestamo, p.multa_por_dia, p.max_renovaciones
       FROM tipo_lector t
       LEFT JOIN politica_prestamo p ON p.id_tipo_lector = t.id_tipo_lector
       WHERE t.estado = 'ACTIVO'`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ── Ejemplares disponibles ──────────────────────────────── */
router.get('/ejemplares-disponibles', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id_ejemplar, e.codigo_barras, l.titulo, l.id_libro
       FROM ejemplar e
       JOIN libro l ON l.id_libro = e.id_libro
       WHERE e.estado = 'DISPONIBLE' AND l.estado = 'ACTIVO'
       ORDER BY l.titulo`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
