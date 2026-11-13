const express  = require('express');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const initDB = require('./init_db');

const publicoRouter      = require('./routes/publico');
const authRouter         = require('./routes/auth');
const librosRouter       = require('./routes/libros');
const lectoresRouter     = require('./routes/lectores');
const prestamosRouter    = require('./routes/prestamos');
const multasRouter       = require('./routes/multas');
const reportesRouter     = require('./routes/reportes');
const catalogoRouter     = require('./routes/catalogo');
const miBibliotecaRouter = require('./routes/miBiblioteca');
const errorHandler       = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ──────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos (portadas) ─────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/publico',        publicoRouter);       // sin JWT
app.use('/api/auth',           authRouter);          // login admin + lector
app.use('/api/libros',         librosRouter);        // admin
app.use('/api/lectores',       lectoresRouter);      // admin
app.use('/api/prestamos',      prestamosRouter);     // admin
app.use('/api/multas',         multasRouter);        // admin
app.use('/api/reportes',       reportesRouter);      // admin
app.use('/api/catalogo',       catalogoRouter);      // admin
app.use('/api/mi-biblioteca',  miBibliotecaRouter);  // lector autenticado

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', db: 'MySQL', ts: new Date().toISOString() })
);

app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));
app.use(errorHandler);

// ── Arrancar DESPUÉS de inicializar la BD ─────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${PORT}`);
      console.log(`   → API: http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ Error al inicializar la BD:', err.message);
    process.exit(1);
  });
