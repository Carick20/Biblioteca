/**
 * init_db.js
 * ──────────────────────────────────────────────────────────────
 * Crea tablas (si no existen) y siembra datos demo al arrancar.
 * Compatible con sql.js (async, puro JavaScript).
 * ──────────────────────────────────────────────────────────────
 */

const pool   = require('./config/database');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'biblioteca.db');

const DDL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS persona (
  id_persona       INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_documento   TEXT NOT NULL DEFAULT 'DNI',
  numero_documento TEXT NOT NULL UNIQUE,
  nombres          TEXT NOT NULL,
  apellidos        TEXT NOT NULL,
  fecha_nacimiento TEXT,
  telefono         TEXT,
  correo           TEXT,
  direccion        TEXT,
  fecha_registro   TEXT NOT NULL DEFAULT (datetime('now')),
  estado           TEXT NOT NULL DEFAULT 'ACTIVO'
);
CREATE TABLE IF NOT EXISTS tipo_lector (
  id_tipo_lector INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL UNIQUE,
  descripcion    TEXT,
  estado         TEXT NOT NULL DEFAULT 'ACTIVO'
);
CREATE TABLE IF NOT EXISTS lector (
  id_lector         INTEGER PRIMARY KEY AUTOINCREMENT,
  id_persona        INTEGER NOT NULL UNIQUE,
  id_tipo_lector    INTEGER NOT NULL,
  codigo_lector     TEXT NOT NULL UNIQUE,
  fecha_inscripcion TEXT NOT NULL,
  fecha_vencimiento TEXT,
  estado            TEXT NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_persona)     REFERENCES persona(id_persona),
  FOREIGN KEY (id_tipo_lector) REFERENCES tipo_lector(id_tipo_lector)
);
CREATE TABLE IF NOT EXISTS empleado (
  id_empleado        INTEGER PRIMARY KEY AUTOINCREMENT,
  id_persona         INTEGER NOT NULL UNIQUE,
  codigo_empleado    TEXT NOT NULL UNIQUE,
  cargo              TEXT NOT NULL,
  fecha_contratacion TEXT,
  estado             TEXT NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona)
);
CREATE TABLE IF NOT EXISTS bibliotecario (
  id_bibliotecario   INTEGER PRIMARY KEY AUTOINCREMENT,
  id_empleado        INTEGER NOT NULL UNIQUE,
  codigo_profesional TEXT,
  estado             TEXT NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado)
);
CREATE TABLE IF NOT EXISTS rol (
  id_rol INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario    INTEGER PRIMARY KEY AUTOINCREMENT,
  id_persona    INTEGER NOT NULL UNIQUE,
  id_rol        INTEGER NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'ACTIVO',
  ultimo_acceso TEXT,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona),
  FOREIGN KEY (id_rol)     REFERENCES rol(id_rol)
);
CREATE TABLE IF NOT EXISTS autor (
  id_autor         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombres          TEXT NOT NULL,
  apellidos        TEXT,
  nacionalidad     TEXT,
  fecha_nacimiento TEXT,
  biografia        TEXT
);
CREATE TABLE IF NOT EXISTS editorial (
  id_editorial INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL UNIQUE,
  pais         TEXT,
  telefono     TEXT,
  correo       TEXT,
  estado       TEXT NOT NULL DEFAULT 'ACTIVO'
);
CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre       TEXT NOT NULL UNIQUE,
  descripcion  TEXT,
  estado       TEXT NOT NULL DEFAULT 'ACTIVO'
);
CREATE TABLE IF NOT EXISTS libro (
  id_libro         INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn             TEXT UNIQUE,
  titulo           TEXT NOT NULL,
  subtitulo        TEXT,
  id_editorial     INTEGER,
  anio_publicacion INTEGER,
  numero_paginas   INTEGER,
  idioma           TEXT DEFAULT 'Español',
  descripcion      TEXT,
  portada_url      TEXT,
  estado           TEXT NOT NULL DEFAULT 'ACTIVO',
  fecha_registro   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_editorial) REFERENCES editorial(id_editorial)
);
CREATE TABLE IF NOT EXISTS libro_autor (
  id_libro INTEGER NOT NULL,
  id_autor INTEGER NOT NULL,
  PRIMARY KEY (id_libro, id_autor),
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro),
  FOREIGN KEY (id_autor) REFERENCES autor(id_autor)
);
CREATE TABLE IF NOT EXISTS libro_categoria (
  id_libro     INTEGER NOT NULL,
  id_categoria INTEGER NOT NULL,
  PRIMARY KEY (id_libro, id_categoria),
  FOREIGN KEY (id_libro)     REFERENCES libro(id_libro),
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);
CREATE TABLE IF NOT EXISTS ejemplar (
  id_ejemplar       INTEGER PRIMARY KEY AUTOINCREMENT,
  id_libro          INTEGER NOT NULL,
  ubicacion         TEXT,
  codigo_barras     TEXT NOT NULL UNIQUE,
  fecha_adquisicion TEXT,
  costo_adquisicion REAL,
  estado            TEXT NOT NULL DEFAULT 'DISPONIBLE',
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro)
);
CREATE TABLE IF NOT EXISTS politica_prestamo (
  id_politica      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_tipo_lector   INTEGER NOT NULL UNIQUE,
  max_libros       INTEGER NOT NULL DEFAULT 3,
  dias_prestamo    INTEGER NOT NULL DEFAULT 7,
  max_renovaciones INTEGER NOT NULL DEFAULT 2,
  dias_renovacion  INTEGER NOT NULL DEFAULT 7,
  multa_por_dia    REAL NOT NULL DEFAULT 1.00,
  FOREIGN KEY (id_tipo_lector) REFERENCES tipo_lector(id_tipo_lector)
);
CREATE TABLE IF NOT EXISTS prestamo (
  id_prestamo      INTEGER PRIMARY KEY AUTOINCREMENT,
  id_lector        INTEGER NOT NULL,
  id_bibliotecario INTEGER NOT NULL,
  fecha_prestamo   TEXT NOT NULL DEFAULT (datetime('now')),
  estado           TEXT NOT NULL DEFAULT 'ACTIVO',
  observaciones    TEXT,
  FOREIGN KEY (id_lector)        REFERENCES lector(id_lector),
  FOREIGN KEY (id_bibliotecario) REFERENCES bibliotecario(id_bibliotecario)
);
CREATE TABLE IF NOT EXISTS detalle_prestamo (
  id_detalle                  INTEGER PRIMARY KEY AUTOINCREMENT,
  id_prestamo                 INTEGER NOT NULL,
  id_ejemplar                 INTEGER NOT NULL,
  fecha_devolucion_programada TEXT NOT NULL,
  estado                      TEXT NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo),
  FOREIGN KEY (id_ejemplar) REFERENCES ejemplar(id_ejemplar)
);
CREATE TABLE IF NOT EXISTS devolucion (
  id_devolucion       INTEGER PRIMARY KEY AUTOINCREMENT,
  id_detalle_prestamo INTEGER NOT NULL UNIQUE,
  id_bibliotecario    INTEGER NOT NULL,
  fecha_devolucion    TEXT NOT NULL DEFAULT (datetime('now')),
  estado_ejemplar     TEXT,
  observaciones       TEXT,
  FOREIGN KEY (id_detalle_prestamo) REFERENCES detalle_prestamo(id_detalle),
  FOREIGN KEY (id_bibliotecario)    REFERENCES bibliotecario(id_bibliotecario)
);
CREATE TABLE IF NOT EXISTS renovacion (
  id_renovacion             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_detalle_prestamo       INTEGER NOT NULL,
  fecha_renovacion          TEXT NOT NULL DEFAULT (datetime('now')),
  fecha_devolucion_anterior TEXT NOT NULL,
  nueva_fecha_devolucion    TEXT NOT NULL,
  motivo                    TEXT,
  FOREIGN KEY (id_detalle_prestamo) REFERENCES detalle_prestamo(id_detalle)
);
CREATE TABLE IF NOT EXISTS reserva (
  id_reserva        INTEGER PRIMARY KEY AUTOINCREMENT,
  id_lector         INTEGER NOT NULL,
  id_libro          INTEGER NOT NULL,
  fecha_reserva     TEXT NOT NULL DEFAULT (datetime('now')),
  fecha_vencimiento TEXT,
  estado            TEXT NOT NULL DEFAULT 'PENDIENTE',
  FOREIGN KEY (id_lector) REFERENCES lector(id_lector),
  FOREIGN KEY (id_libro)  REFERENCES libro(id_libro)
);
CREATE TABLE IF NOT EXISTS multa (
  id_multa         INTEGER PRIMARY KEY AUTOINCREMENT,
  id_lector        INTEGER NOT NULL,
  id_prestamo      INTEGER NOT NULL,
  concepto         TEXT NOT NULL,
  monto            REAL NOT NULL,
  fecha_generacion TEXT NOT NULL DEFAULT (datetime('now')),
  fecha_pago       TEXT,
  estado           TEXT NOT NULL DEFAULT 'PENDIENTE',
  FOREIGN KEY (id_lector)   REFERENCES lector(id_lector),
  FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo)
);
CREATE TABLE IF NOT EXISTS historial_actividad (
  id_historial INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario   INTEGER,
  accion       TEXT NOT NULL,
  detalle      TEXT,
  ip_origen    TEXT,
  fecha        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);
CREATE TABLE IF NOT EXISTS configuracion (
  clave       TEXT PRIMARY KEY,
  valor       TEXT NOT NULL,
  descripcion TEXT
);
`;

// Guardar BD en disco
function persist(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDB() {
  console.log('🗄️  Inicializando base de datos SQLite (sql.js)…');

  const db = await pool._raw();

  // Crear todas las tablas
  db.run(DDL);

  // Verificar si ya hay datos seed
  const hayRoles = db.exec("SELECT COUNT(*) AS n FROM rol")[0]?.values[0][0] ?? 0;
  if (hayRoles > 0) {
    console.log('   ✔ Datos iniciales ya presentes. Seed omitido.');
    persist(db);
    return;
  }

  console.log('   🌱 Insertando datos iniciales…');

  const hoy   = new Date().toISOString().slice(0, 10);
  const vence = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  // Helper: ejecutar INSERT y retornar lastInsertRowid
  const ins = (sql, ...args) => {
    db.run(sql, args);
    return db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
  };

  // Roles
  ins("INSERT INTO rol(nombre) VALUES(?)", 'ADMIN');
  ins("INSERT INTO rol(nombre) VALUES(?)", 'BIBLIOTECARIO');
  ins("INSERT INTO rol(nombre) VALUES(?)", 'CONSULTA');

  // Tipos de lector + políticas de préstamo
  const tEst = ins("INSERT INTO tipo_lector(nombre,descripcion) VALUES(?,?)", 'Estudiante',      'Alumno de nivel educativo');
  const tDoc = ins("INSERT INTO tipo_lector(nombre,descripcion) VALUES(?,?)", 'Docente',         'Profesor o investigador');
  const tExt = ins("INSERT INTO tipo_lector(nombre,descripcion) VALUES(?,?)", 'Usuario externo', 'Persona externa a la institución');

  ins("INSERT INTO politica_prestamo(id_tipo_lector,max_libros,dias_prestamo,max_renovaciones,dias_renovacion,multa_por_dia) VALUES(?,?,?,?,?,?)", tEst, 3,  7, 2, 7, 1.00);
  ins("INSERT INTO politica_prestamo(id_tipo_lector,max_libros,dias_prestamo,max_renovaciones,dias_renovacion,multa_por_dia) VALUES(?,?,?,?,?,?)", tDoc, 5, 14, 3, 7, 0.50);
  ins("INSERT INTO politica_prestamo(id_tipo_lector,max_libros,dias_prestamo,max_renovaciones,dias_renovacion,multa_por_dia) VALUES(?,?,?,?,?,?)", tExt, 2,  7, 1, 7, 2.00);

  // Admin: persona → empleado → bibliotecario → usuario
  const pAdmin = ins("INSERT INTO persona(tipo_documento,numero_documento,nombres,apellidos) VALUES('DNI','00000001','Administrador','General')");
  const eAdmin = ins("INSERT INTO empleado(id_persona,codigo_empleado,cargo,fecha_contratacion) VALUES(?,'EMP-001','Jefe de Biblioteca',?)", pAdmin, hoy);
  ins("INSERT INTO bibliotecario(id_empleado) VALUES(?)", eAdmin);
  const hashAdmin = bcrypt.hashSync('admin123', 10);
  ins("INSERT INTO usuario(id_persona,id_rol,username,password_hash) VALUES(?,1,'admin',?)", pAdmin, hashAdmin);

  // Lectores demo
  const lectoresDemo = [
    ['70000001', 'María',   'López',  tEst],
    ['70000002', 'Juan',    'Pérez',  tDoc],
    ['70000003', 'Ana',     'Torres', tEst],
  ];
  for (const [doc, nom, ape, tipo] of lectoresDemo) {
    const p = ins(
      "INSERT INTO persona(tipo_documento,numero_documento,nombres,apellidos,correo) VALUES('DNI',?,?,?,?)",
      doc, nom, ape, `${nom.toLowerCase()}@example.com`
    );
    ins(
      "INSERT INTO lector(id_persona,id_tipo_lector,codigo_lector,fecha_inscripcion,fecha_vencimiento) VALUES(?,?,?,?,?)",
      p, tipo, `LEC-${String(p).padStart(4,'0')}`, hoy, vence
    );
  }

  // Editoriales y categorías
  const edAl = ins("INSERT INTO editorial(nombre,pais) VALUES('Alfaguara','España')");
  const edLo = ins("INSERT INTO editorial(nombre,pais) VALUES('Losada','Argentina')");
               ins("INSERT INTO editorial(nombre,pais) VALUES('Planeta','España')");
  const catL = ins("INSERT INTO categoria(nombre) VALUES('Literatura')");
               ins("INSERT INTO categoria(nombre) VALUES('Ciencia')");
               ins("INSERT INTO categoria(nombre) VALUES('Historia')");
               ins("INSERT INTO categoria(nombre) VALUES('Tecnología')");

  // Libros + autores + ejemplares demo
  const librosDemo = [
    ['Los ríos profundos',          'José María', 'Arguedas',       'Peruana',    1958, edAl, 2],
    ['Conversación en La Catedral', 'Mario',      'Vargas Llosa',   'Peruana',    1969, edAl, 1],
    ['Rayuela',                     'Julio',      'Cortázar',       'Argentina',  1963, edLo, 2],
    ['Ficciones',                   'Jorge Luis', 'Borges',         'Argentina',  1944, edLo, 3],
    ['Cien años de soledad',        'Gabriel',    'García Márquez', 'Colombiana', 1967, edAl, 2],
  ];
  for (const [titulo, nom, ape, nac, anio, edId, nEj] of librosDemo) {
    const aId = ins("INSERT INTO autor(nombres,apellidos,nacionalidad) VALUES(?,?,?)", nom, ape, nac);
    const lId = ins("INSERT INTO libro(titulo,id_editorial,anio_publicacion,idioma) VALUES(?,?,?,'Español')", titulo, edId, anio);
    ins("INSERT INTO libro_autor(id_libro,id_autor) VALUES(?,?)", lId, aId);
    ins("INSERT INTO libro_categoria(id_libro,id_categoria) VALUES(?,?)", lId, catL);
    for (let k = 1; k <= nEj; k++) {
      ins(
        "INSERT INTO ejemplar(id_libro,codigo_barras,fecha_adquisicion) VALUES(?,?,?)",
        lId, `L${String(lId).padStart(5,'0')}-${String(k).padStart(2,'0')}`, hoy
      );
    }
  }

  // Configuración del sistema
  for (const [c, v, d] of [
    ['nombre_biblioteca',     'Biblioteca Municipal', 'Nombre del sistema'],
    ['moneda',                'S/',                   'Símbolo de moneda'],
    ['max_dias_reserva',      '3',                    'Días máximos de reserva'],
    ['correo_notificaciones', 'biblio@example.com',   'Correo para notificaciones'],
  ]) {
    ins("INSERT OR IGNORE INTO configuracion(clave,valor,descripcion) VALUES(?,?,?)", c, v, d);
  }

  // Guardar todo en disco
  persist(db);

  console.log('   ✔ Seed completado.');
  console.log('   → Usuario: admin  |  Contraseña: admin123');
}

module.exports = initDB;
