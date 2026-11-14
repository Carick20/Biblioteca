const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/database');
require('dotenv').config();

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// POST /api/auth/login  — Admin / Bibliotecario
// ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Usuario y contraseña requeridos.' });

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.username, u.password_hash, u.estado,
              r.nombre AS rol, p.nombres, p.apellidos
       FROM usuario u
       JOIN rol     r ON r.id_rol      = u.id_rol
       JOIN persona p ON p.id_persona  = u.id_persona
       WHERE u.username = ?`,
      [username]
    );

    if (!rows.length || rows[0].estado !== 'ACTIVO')
      return res.status(401).json({ message: 'Credenciales inválidas.' });

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Credenciales inválidas.' });

    const token = jwt.sign(
      { id: user.id_usuario, username: user.username, rol: user.rol, tipo: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '24h' }
    );

    res.json({
      token,
      user: {
        id:       user.id_usuario,
        username: user.username,
        nombre:   `${user.nombres} ${user.apellidos}`,
        rol:      user.rol,
        tipo:     'admin',
      },
    });
  } catch (err) { next(err); }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/lector-register
// Registra un lector nuevo COMPLETO: crea persona + lector.
// Genera el codigo_lector automáticamente (LEC-XXXX).
// Body: { nombres, apellidos, numero_documento, correo,
//         telefono?, tipo_documento?, password, confirmar_password }
// ──────────────────────────────────────────────────────────────
router.post('/lector-register', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      nombres, apellidos, numero_documento,
      correo, telefono,
      tipo_documento = 'DNI',
      password, confirmar_password,
    } = req.body;

    // Validaciones básicas
    if (!nombres?.trim() || !apellidos?.trim())
      return res.status(400).json({ message: 'Nombre y apellidos son requeridos.' });
    if (!numero_documento?.trim())
      return res.status(400).json({ message: 'El número de documento es requerido.' });
    if (!correo?.trim())
      return res.status(400).json({ message: 'El correo electrónico es requerido.' });
    if (!password || password.length < 6)
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    if (password !== confirmar_password)
      return res.status(400).json({ message: 'Las contraseñas no coinciden.' });

    // Verificar duplicados
    const [[docExiste]] = await conn.query(
      'SELECT id_persona FROM persona WHERE numero_documento = ?',
      [numero_documento.trim()]
    );
    if (docExiste) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Ya existe una cuenta con ese número de documento.' });
    }

    const [[correoExiste]] = await conn.query(
      'SELECT id_persona FROM persona WHERE correo = ?',
      [correo.trim().toLowerCase()]
    );
    if (correoExiste) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Ya existe una cuenta con ese correo electrónico.' });
    }

    // Crear persona
    const [rPersona] = await conn.query(
      `INSERT INTO persona (tipo_documento, numero_documento, nombres, apellidos, correo, telefono)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tipo_documento.trim(),
        numero_documento.trim(),
        nombres.trim(),
        apellidos.trim(),
        correo.trim().toLowerCase(),
        telefono?.trim() || null,
      ]
    );
    const id_persona = rPersona.insertId;

    // Generar codigo_lector único: LEC-XXXX
    const [[{ ultimo }]] = await conn.query(
      `SELECT MAX(CAST(SUBSTRING(codigo_lector, 5) AS UNSIGNED)) AS ultimo FROM lector`
    );
    const siguiente = (ultimo || 0) + 1;
    const codigo_lector = `LEC-${String(siguiente).padStart(4, '0')}`;

    // Fecha inscripción hoy, vencimiento +1 año
    const hoy    = new Date().toISOString().slice(0, 10);
    const vence  = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

    // tipo_lector 3 = "Usuario externo" por defecto para auto-registro
    const id_tipo_lector = 3;

    const hash = await bcrypt.hash(password, 10);

    await conn.query(
      `INSERT INTO lector
         (id_persona, id_tipo_lector, codigo_lector, fecha_inscripcion, fecha_vencimiento, estado, password_hash)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)`,
      [id_persona, id_tipo_lector, codigo_lector, hoy, vence, hash]
    );

    await conn.commit(); conn.release();

    res.status(201).json({
      message:       `Cuenta creada correctamente. Tu código de lector es ${codigo_lector}.`,
      codigo_lector,
    });
  } catch (err) {
    await conn.rollback(); conn.release();
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/lector-login
// Login con correo + contraseña  o  numero_documento + contraseña.
// ──────────────────────────────────────────────────────────────
router.post('/lector-login', async (req, res, next) => {
  try {
    const { correo, numero_documento, password } = req.body;

    if (!password)
      return res.status(400).json({ message: 'La contraseña es requerida.' });
    if (!correo && !numero_documento)
      return res.status(400).json({ message: 'Proporciona tu correo o número de documento.' });

    const [rows] = await pool.query(
      `SELECT lc.id_lector, lc.codigo_lector, lc.estado, lc.fecha_vencimiento,
              lc.password_hash,
              p.nombres, p.apellidos, p.correo, p.numero_documento,
              tl.nombre AS tipo_lector
       FROM lector lc
       JOIN persona     p  ON p.id_persona      = lc.id_persona
       JOIN tipo_lector tl ON tl.id_tipo_lector = lc.id_tipo_lector
       WHERE ${correo ? 'p.correo = ?' : 'p.numero_documento = ?'}`,
      [correo ? correo.trim().toLowerCase() : numero_documento.trim()]
    );

    if (!rows.length)
      return res.status(401).json({ message: 'Correo/documento o contraseña incorrectos.' });

    const lector = rows[0];

    if (!lector.password_hash)
      return res.status(401).json({ message: 'Esta cuenta no tiene contraseña. Regístrate primero.' });

    const valid = await bcrypt.compare(password, lector.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Correo/documento o contraseña incorrectos.' });

    if (lector.estado !== 'ACTIVO')
      return res.status(401).json({ message: 'Tu cuenta está inactiva. Consulta en biblioteca.' });

    const hoy = new Date().toISOString().slice(0, 10);
    if (lector.fecha_vencimiento && lector.fecha_vencimiento < hoy)
      return res.status(401).json({ message: 'Tu inscripción está vencida. Renuévala en biblioteca.' });

    const token = jwt.sign(
      { id: lector.id_lector, codigo_lector: lector.codigo_lector, tipo: 'lector' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      lector: {
        id:            lector.id_lector,
        codigo_lector: lector.codigo_lector,
        nombre:        `${lector.nombres} ${lector.apellidos}`,
        correo:        lector.correo,
        tipo_lector:   lector.tipo_lector,
        tipo:          'lector',
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
