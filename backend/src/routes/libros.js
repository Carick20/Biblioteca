const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const pool     = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

// ── Configuración de multer para portadas ─────────────────────
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'portadas');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `portada_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP).'));
  },
});

/* GET /api/libros?q=&page=1&limit=20 */
router.get('/', async (req, res, next) => {
  try {
    const { q = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const like   = `%${q}%`;

    const [libros] = await pool.query(
      `SELECT l.*,
              ed.nombre AS editorial_nombre,
              GROUP_CONCAT(DISTINCT (a.nombres || ' ' || COALESCE(a.apellidos,''))) AS autores,
              GROUP_CONCAT(DISTINCT c.nombre) AS categorias,
              COUNT(DISTINCT e.id_ejemplar)   AS total_ejemplares,
              SUM(CASE WHEN e.estado='DISPONIBLE' THEN 1 ELSE 0 END) AS disponibles
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
       GROUP BY l.id_libro
       ORDER BY l.titulo
       LIMIT ? OFFSET ?`,
      [like, like, like, like, parseInt(limit, 10), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT l.id_libro) AS total
       FROM libro l
       LEFT JOIN libro_autor la ON la.id_libro = l.id_libro
       LEFT JOIN autor a ON a.id_autor = la.id_autor
       WHERE l.estado = 'ACTIVO'
         AND (l.titulo LIKE ? OR l.isbn LIKE ?
              OR a.nombres LIKE ? OR a.apellidos LIKE ?)`,
      [like, like, like, like]
    );

    res.json({ data: libros, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) { next(err); }
});

/* GET /api/libros/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*,
              ed.nombre AS editorial_nombre,
              GROUP_CONCAT(DISTINCT (a.nombres || ' ' || COALESCE(a.apellidos,''))) AS autores,
              GROUP_CONCAT(DISTINCT c.nombre) AS categorias
       FROM libro l
       LEFT JOIN editorial      ed ON ed.id_editorial  = l.id_editorial
       LEFT JOIN libro_autor    la ON la.id_libro       = l.id_libro
       LEFT JOIN autor          a  ON a.id_autor        = la.id_autor
       LEFT JOIN libro_categoria lc ON lc.id_libro      = l.id_libro
       LEFT JOIN categoria      c  ON c.id_categoria    = lc.id_categoria
       WHERE l.id_libro = ?
       GROUP BY l.id_libro`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Libro no encontrado.' });

    const [ejemplares] = await pool.query(
      'SELECT * FROM ejemplar WHERE id_libro = ? ORDER BY codigo_barras',
      [req.params.id]
    );
    res.json({ ...rows[0], ejemplares });
  } catch (err) { next(err); }
});

/* POST /api/libros  (multipart/form-data para portada opcional) */
router.post('/', upload.single('portada'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { titulo, isbn, editorial, anio_publicacion, idioma, descripcion,
            numero_paginas, autores = [], categorias = [], n_ejemplares = 1 } = req.body;

    if (!titulo) {
      await conn.rollback(); conn.release();
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: 'El título es obligatorio.' });
    }

    // Portada: si se subió un archivo usar su ruta, si viene URL usar esa
    let portada_url = null;
    if (req.file) {
      portada_url = `/uploads/portadas/${req.file.filename}`;
    } else if (req.body.portada_url) {
      portada_url = req.body.portada_url.trim() || null;
    }

    // Editorial: buscar o crear
    let id_editorial = null;
    if (editorial && editorial.trim()) {
      const [ed] = await conn.query('SELECT id_editorial FROM editorial WHERE nombre = ?', [editorial.trim()]);
      id_editorial = ed.length
        ? ed[0].id_editorial
        : (await conn.query('INSERT INTO editorial(nombre) VALUES(?)', [editorial.trim()]))[0].insertId;
    }

    const [libResult] = await conn.query(
      `INSERT INTO libro(titulo, isbn, id_editorial, anio_publicacion, idioma, descripcion, numero_paginas, portada_url)
       VALUES(?,?,?,?,?,?,?,?)`,
      [titulo.trim(), isbn || null, id_editorial,
       anio_publicacion || null, idioma || null, descripcion || null,
       numero_paginas || null, portada_url]
    );
    const id_libro = libResult.insertId;

    // Autores
    const autoresArr = Array.isArray(autores) ? autores : autores.split(',').map(s => s.trim()).filter(Boolean);
    for (const nombreAutor of autoresArr) {
      if (!nombreAutor.trim()) continue;
      const partes    = nombreAutor.trim().split(' ');
      const nombres   = partes.slice(0, -1).join(' ') || partes[0];
      const apellidos = partes.length > 1 ? partes[partes.length - 1] : '';
      const [ax] = await conn.query(
        'SELECT id_autor FROM autor WHERE nombres = ? AND apellidos = ?', [nombres, apellidos]);
      const id_autor = ax.length
        ? ax[0].id_autor
        : (await conn.query('INSERT INTO autor(nombres,apellidos) VALUES(?,?)', [nombres, apellidos]))[0].insertId;
      await conn.query('INSERT OR IGNORE INTO libro_autor(id_libro,id_autor) VALUES(?,?)', [id_libro, id_autor]);
    }

    // Categorías
    const categoriasArr = Array.isArray(categorias) ? categorias : categorias.split(',').map(s => s.trim()).filter(Boolean);
    for (const nombreCat of categoriasArr) {
      if (!nombreCat.trim()) continue;
      const [cx] = await conn.query('SELECT id_categoria FROM categoria WHERE nombre = ?', [nombreCat.trim()]);
      const id_cat = cx.length
        ? cx[0].id_categoria
        : (await conn.query('INSERT INTO categoria(nombre) VALUES(?)', [nombreCat.trim()]))[0].insertId;
      await conn.query('INSERT OR IGNORE INTO libro_categoria(id_libro,id_categoria) VALUES(?,?)', [id_libro, id_cat]);
    }

    // Ejemplares
    const hoy = new Date().toISOString().slice(0, 10);
    for (let k = 1; k <= parseInt(n_ejemplares, 10); k++) {
      await conn.query(
        'INSERT INTO ejemplar(id_libro, codigo_barras, fecha_adquisicion) VALUES(?,?,?)',
        [id_libro, `L${String(id_libro).padStart(5,'0')}-${String(k).padStart(2,'0')}`, hoy]
      );
    }

    await conn.commit(); conn.release();
    res.status(201).json({ message: 'Libro registrado correctamente.', id_libro, portada_url });
  } catch (err) {
    await conn.rollback(); conn.release();
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

/* PUT /api/libros/:id  (multipart/form-data para portada opcional) */
router.put('/:id', upload.single('portada'), async (req, res, next) => {
  try {
    const { titulo, isbn, anio_publicacion, idioma, descripcion, numero_paginas, estado } = req.body;

    // Si se sube nueva imagen, borrar la antigua
    let portada_url;
    if (req.file) {
      // Obtener portada anterior para borrarla
      const [rows] = await pool.query('SELECT portada_url FROM libro WHERE id_libro = ?', [req.params.id]);
      if (rows.length && rows[0].portada_url && rows[0].portada_url.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', '..', rows[0].portada_url);
        fs.unlink(oldPath, () => {});
      }
      portada_url = `/uploads/portadas/${req.file.filename}`;
    } else if (req.body.portada_url !== undefined) {
      portada_url = req.body.portada_url.trim() || null;
    }

    const [r] = await pool.query(
      `UPDATE libro SET
         titulo           = COALESCE(?, titulo),
         isbn             = ?,
         anio_publicacion = ?,
         idioma           = COALESCE(?, idioma),
         descripcion      = ?,
         numero_paginas   = ?,
         estado           = COALESCE(?, estado)
         ${portada_url !== undefined ? ', portada_url = ?' : ''}
       WHERE id_libro = ?`,
      portada_url !== undefined
        ? [titulo || null, isbn || null, anio_publicacion || null, idioma || null,
           descripcion || null, numero_paginas || null, estado || null, portada_url, req.params.id]
        : [titulo || null, isbn || null, anio_publicacion || null, idioma || null,
           descripcion || null, numero_paginas || null, estado || null, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Libro no encontrado.' });
    res.json({ message: 'Libro actualizado.', portada_url });
  } catch (err) { next(err); }
});

/* DELETE /api/libros/:id  (baja lógica) */
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query("UPDATE libro SET estado='INACTIVO' WHERE id_libro=?", [req.params.id]);
    res.json({ message: 'Libro dado de baja.' });
  } catch (err) { next(err); }
});

module.exports = router;
