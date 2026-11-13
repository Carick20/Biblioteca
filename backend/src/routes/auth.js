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
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña requeridos.' });
    }

    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.username, u.password_hash, u.estado,
              r.nombre AS rol,
              p.nombres, p.apellidos
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       JOIN persona p ON p.id_persona = u.id_persona
       WHERE u.username = ?`,
      [username]
    );

    if (!rows.length || rows[0].estado !== 'ACTIVO') {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

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
  } catch (err) {
    next(err);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/auth/lector-login  — Portal público de lectores
// Autentica por número de documento + código de lector
// ──────────────────────────────────────────────────────────────
router.post('/lector-login', async (req, res, next) => {
  try {
    const { numero_documento, codigo_lector } = req.body;
    if (!numero_documento || !codigo_lector) {
      return res.status(400).json({ message: 'Documento y código de lector requeridos.' });
    }

    const [rows] = await pool.query(
      `SELECT lc.id_lector, lc.codigo_lector, lc.estado, lc.fecha_vencimiento,
              p.nombres, p.apellidos, p.correo, p.numero_documento,
              tl.nombre AS tipo_lector
       FROM lector lc
       JOIN persona     p  ON p.id_persona     = lc.id_persona
       JOIN tipo_lector tl ON tl.id_tipo_lector = lc.id_tipo_lector
       WHERE p.numero_documento = ? AND lc.codigo_lector = ?`,
      [numero_documento.trim(), codigo_lector.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Documento o código de lector incorrectos.' });
    }

    const lector = rows[0];
    if (lector.estado !== 'ACTIVO') {
      return res.status(401).json({ message: 'Tu cuenta de lector está inactiva. Consulta en biblioteca.' });
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (lector.fecha_vencimiento && lector.fecha_vencimiento < hoy) {
      return res.status(401).json({ message: 'Tu inscripción está vencida. Renuévala en biblioteca.' });
    }

    // Token separado con tipo: 'lector'
    const token = jwt.sign(
      {
        id:            lector.id_lector,
        codigo_lector: lector.codigo_lector,
        tipo:          'lector',
      },
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
  } catch (err) {
    next(err);
  }
});

module.exports = router;
