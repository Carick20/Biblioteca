/**
 * middleware/errorHandler.js
 * Manejo global de errores — compatible con SQLite y mysql2.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('[ERROR]', err.message || err);

  // Duplicado (asignado por database.js al capturar UNIQUE constraint)
  if (err.code === 'ER_DUP_ENTRY' ||
      (err.message && err.message.includes('UNIQUE constraint failed'))) {
    return res.status(409).json({
      message: 'Ya existe un registro con esos datos (valor duplicado).'
    });
  }

  // Llave foránea (asignado por database.js al capturar FOREIGN KEY constraint)
  if (err.code === 'ER_NO_REFERENCED_ROW_2' ||
      (err.message && err.message.includes('FOREIGN KEY constraint failed'))) {
    return res.status(400).json({
      message: 'El registro referenciado no existe en la base de datos.'
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;
