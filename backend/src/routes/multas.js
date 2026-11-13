const express = require('express');
const pool    = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

/* GET /api/multas */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*,
              CONCAT(p.nombres, ' ', p.apellidos) AS lector,
              lc.codigo_lector
       FROM multa m
       JOIN lector lc ON lc.id_lector  = m.id_lector
       JOIN persona p  ON p.id_persona  = lc.id_persona
       ORDER BY m.estado DESC, m.fecha_generacion DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* PATCH /api/multas/:id/pagar */
router.patch('/:id/pagar', async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "UPDATE multa SET estado='PAGADA', fecha_pago=NOW() WHERE id_multa=? AND estado='PENDIENTE'",
      [req.params.id]
    );
    if (!r.affectedRows)
      return res.status(400).json({ message: 'La multa ya fue pagada o no existe.' });
    res.json({ message: 'Multa marcada como pagada.' });
  } catch (err) { next(err); }
});

module.exports = router;
