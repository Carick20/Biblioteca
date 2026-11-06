const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * verifyToken  — acepta cualquier JWT válido (admin o lector).
 *   Adjunta el payload decodificado en req.user.
 */
const verifyToken = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/**
 * requireAdmin — solo permite tokens con tipo === 'admin'.
 *   Úsalo en todas las rutas del panel administrativo.
 */
const requireAdmin = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tipo !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado: se requiere cuenta de administrador.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/**
 * requireLector — solo permite tokens con tipo === 'lector'.
 *   Úsalo en las rutas del portal de lectores.
 */
const requireLector = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tipo !== 'lector') {
      return res.status(403).json({ message: 'Acceso denegado: se requiere cuenta de lector.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = { verifyToken, requireAdmin, requireLector };
