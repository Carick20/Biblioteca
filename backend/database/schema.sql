
-- ============================================================
--  SISTEMA INTEGRAL DE GESTIÓN BIBLIOTECARIA
--  Base de datos: biblioteca_db
--  Motor: MySQL 8.0+
--  Basado en: schema.sql del ZIP + mejoras adicionales
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

CREATE DATABASE IF NOT EXISTS biblioteca_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biblioteca_db;

-- ── 1. PERSONA ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS persona (
  id_persona      INT AUTO_INCREMENT PRIMARY KEY,
  tipo_documento  VARCHAR(20)  NOT NULL DEFAULT 'DNI',
  numero_documento VARCHAR(20) NOT NULL UNIQUE,
  nombres         VARCHAR(100) NOT NULL,
  apellidos       VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE,
  telefono        VARCHAR(20),
  correo          VARCHAR(120),
  direccion       VARCHAR(200),
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

-- ── 2. TIPO DE LECTOR ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipo_lector (
  id_tipo_lector INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(80)  NOT NULL UNIQUE,
  descripcion    TEXT,
  estado         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

-- ── 3. LECTOR ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lector (
  id_lector         INT AUTO_INCREMENT PRIMARY KEY,
  id_persona        INT  NOT NULL UNIQUE,
  id_tipo_lector    INT  NOT NULL,
  codigo_lector     VARCHAR(30) NOT NULL UNIQUE,
  fecha_inscripcion DATE NOT NULL,
  fecha_vencimiento DATE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_persona)     REFERENCES persona(id_persona)       ON DELETE RESTRICT,
  FOREIGN KEY (id_tipo_lector) REFERENCES tipo_lector(id_tipo_lector) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 4. EMPLEADO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empleado (
  id_empleado       INT AUTO_INCREMENT PRIMARY KEY,
  id_persona        INT NOT NULL UNIQUE,
  codigo_empleado   VARCHAR(30) NOT NULL UNIQUE,
  cargo             VARCHAR(100) NOT NULL,
  fecha_contratacion DATE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 5. BIBLIOTECARIO ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bibliotecario (
  id_bibliotecario  INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado       INT NOT NULL UNIQUE,
  codigo_profesional VARCHAR(30),
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 6. ROL ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rol (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ── 7. USUARIO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario    INT AUTO_INCREMENT PRIMARY KEY,
  id_persona    INT NOT NULL UNIQUE,
  id_rol        INT NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  estado        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO',
  ultimo_acceso DATETIME,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona) ON DELETE RESTRICT,
  FOREIGN KEY (id_rol)     REFERENCES rol(id_rol)         ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 8. AUTOR ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autor (
  id_autor        INT AUTO_INCREMENT PRIMARY KEY,
  nombres         VARCHAR(100) NOT NULL,
  apellidos       VARCHAR(100),
  nacionalidad    VARCHAR(80),
  fecha_nacimiento DATE,
  biografia       TEXT
) ENGINE=InnoDB;

-- ── 9. EDITORIAL ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editorial (
  id_editorial INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL UNIQUE,
  pais         VARCHAR(80),
  telefono     VARCHAR(20),
  correo       VARCHAR(120),
  estado       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

-- ── 10. CATEGORÍA ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL UNIQUE,
  descripcion  TEXT,
  estado       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

-- ── 11. LIBRO ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS libro (
  id_libro         INT AUTO_INCREMENT PRIMARY KEY,
  isbn             VARCHAR(20) UNIQUE,
  titulo           VARCHAR(200) NOT NULL,
  subtitulo        VARCHAR(200),
  id_editorial     INT,
  anio_publicacion YEAR,
  numero_paginas   INT,
  idioma           VARCHAR(50) DEFAULT 'Español',
  descripcion      TEXT,
  portada_url      VARCHAR(500),            -- ← MEJORA: imagen de portada
  estado           VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_registro   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_editorial) REFERENCES editorial(id_editorial) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 12. LIBRO ↔ AUTOR (N:M) ────────────────────────────────
CREATE TABLE IF NOT EXISTS libro_autor (
  id_libro INT NOT NULL,
  id_autor INT NOT NULL,
  PRIMARY KEY (id_libro, id_autor),
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro) ON DELETE CASCADE,
  FOREIGN KEY (id_autor) REFERENCES autor(id_autor) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 13. LIBRO ↔ CATEGORÍA (N:M) ────────────────────────────
CREATE TABLE IF NOT EXISTS libro_categoria (
  id_libro     INT NOT NULL,
  id_categoria INT NOT NULL,
  PRIMARY KEY (id_libro, id_categoria),
  FOREIGN KEY (id_libro)     REFERENCES libro(id_libro)         ON DELETE CASCADE,
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 14. EJEMPLAR ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ejemplar (
  id_ejemplar        INT AUTO_INCREMENT PRIMARY KEY,
  id_libro           INT NOT NULL,
  ubicacion          VARCHAR(60),
  codigo_barras      VARCHAR(50) NOT NULL UNIQUE,
  fecha_adquisicion  DATE,
  costo_adquisicion  DECIMAL(10,2),
  estado             VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
  -- DISPONIBLE | PRESTADO | DAÑADO | PERDIDO | BAJA
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 15. POLÍTICA DE PRÉSTAMO ─────────────────────────────────
-- RN06, RN07, RN11: límites por tipo de lector
CREATE TABLE IF NOT EXISTS politica_prestamo (
  id_politica       INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo_lector    INT NOT NULL UNIQUE,
  max_libros        INT NOT NULL DEFAULT 3,
  dias_prestamo     INT NOT NULL DEFAULT 7,
  max_renovaciones  INT NOT NULL DEFAULT 2,
  dias_renovacion   INT NOT NULL DEFAULT 7,
  multa_por_dia     DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  FOREIGN KEY (id_tipo_lector) REFERENCES tipo_lector(id_tipo_lector) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 16. PRÉSTAMO ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamo (
  id_prestamo     INT AUTO_INCREMENT PRIMARY KEY,
  id_lector       INT NOT NULL,
  id_bibliotecario INT NOT NULL,
  fecha_prestamo  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  observaciones   TEXT,
  FOREIGN KEY (id_lector)       REFERENCES lector(id_lector)           ON DELETE RESTRICT,
  FOREIGN KEY (id_bibliotecario) REFERENCES bibliotecario(id_bibliotecario) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 17. DETALLE DE PRÉSTAMO ──────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_prestamo (
  id_detalle                 INT AUTO_INCREMENT PRIMARY KEY,
  id_prestamo                INT NOT NULL,
  id_ejemplar                INT NOT NULL,
  fecha_devolucion_programada DATE NOT NULL,
  estado                     VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  -- ACTIVO | DEVUELTO | DAÑADO | PERDIDO
  FOREIGN KEY (id_prestamo)  REFERENCES prestamo(id_prestamo) ON DELETE RESTRICT,
  FOREIGN KEY (id_ejemplar)  REFERENCES ejemplar(id_ejemplar) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 18. DEVOLUCIÓN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devolucion (
  id_devolucion          INT AUTO_INCREMENT PRIMARY KEY,
  id_detalle_prestamo    INT NOT NULL UNIQUE,
  id_bibliotecario       INT NOT NULL,
  fecha_devolucion       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado_ejemplar        VARCHAR(30),
  observaciones          TEXT,
  FOREIGN KEY (id_detalle_prestamo) REFERENCES detalle_prestamo(id_detalle) ON DELETE RESTRICT,
  FOREIGN KEY (id_bibliotecario)    REFERENCES bibliotecario(id_bibliotecario) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 19. RENOVACIÓN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS renovacion (
  id_renovacion           INT AUTO_INCREMENT PRIMARY KEY,
  id_detalle_prestamo     INT NOT NULL,
  fecha_renovacion        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion_anterior DATE NOT NULL,
  nueva_fecha_devolucion  DATE NOT NULL,
  motivo                  VARCHAR(200),
  FOREIGN KEY (id_detalle_prestamo) REFERENCES detalle_prestamo(id_detalle) ON DELETE RESTRICT,
  CHECK (nueva_fecha_devolucion > fecha_devolucion_anterior)
) ENGINE=InnoDB;

-- ── 20. RESERVA ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reserva (
  id_reserva       INT AUTO_INCREMENT PRIMARY KEY,
  id_lector        INT NOT NULL,
  id_libro         INT NOT NULL,
  fecha_reserva    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE,
  estado           VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  -- PENDIENTE | ATENDIDA | CANCELADA | EXPIRADA
  FOREIGN KEY (id_lector) REFERENCES lector(id_lector) ON DELETE RESTRICT,
  FOREIGN KEY (id_libro)  REFERENCES libro(id_libro)   ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ── 21. MULTA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS multa (
  id_multa         INT AUTO_INCREMENT PRIMARY KEY,
  id_lector        INT NOT NULL,
  id_prestamo      INT NOT NULL,
  concepto         VARCHAR(150) NOT NULL,
  monto            DECIMAL(10,2) NOT NULL,
  fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_pago       DATETIME,                -- ← MEJORA: registrar cuándo se pagó
  estado           VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  -- PENDIENTE | PAGADA | CONDONADA
  FOREIGN KEY (id_lector)  REFERENCES lector(id_lector)   ON DELETE RESTRICT,
  FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo) ON DELETE RESTRICT,
  CHECK (monto >= 0)
) ENGINE=InnoDB;

-- ── 22. HISTORIAL DE ACTIVIDAD (MEJORA) ─────────────────────
-- Registro de acciones relevantes del sistema para auditoría
CREATE TABLE IF NOT EXISTS historial_actividad (
  id_historial  INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario    INT,
  accion        VARCHAR(100) NOT NULL,
  detalle       TEXT,
  ip_origen     VARCHAR(45),
  fecha         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 23. CONFIGURACIÓN DEL SISTEMA (MEJORA) ──────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  clave       VARCHAR(80) PRIMARY KEY,
  valor       VARCHAR(500) NOT NULL,
  descripcion VARCHAR(200)
) ENGINE=InnoDB;

SET foreign_key_checks = 1;

-- ============================================================
--  DATOS INICIALES (SEED)
-- ============================================================

-- Roles
INSERT IGNORE INTO rol(nombre) VALUES('ADMIN'), ('BIBLIOTECARIO'), ('CONSULTA');

-- Tipos de lector + políticas
INSERT IGNORE INTO tipo_lector(id_tipo_lector, nombre, descripcion) VALUES
  (1, 'Estudiante',      'Alumno de cualquier nivel educativo'),
  (2, 'Docente',         'Profesor o investigador'),
  (3, 'Usuario externo', 'Persona externa a la institución');

INSERT IGNORE INTO politica_prestamo
  (id_tipo_lector, max_libros, dias_prestamo, max_renovaciones, dias_renovacion, multa_por_dia) VALUES
  (1, 3,  7, 2, 7, 1.00),   -- Estudiante
  (2, 5, 14, 3, 7, 0.50),   -- Docente
  (3, 2,  7, 1, 7, 2.00);   -- Usuario externo

-- Persona y usuario administrador
INSERT IGNORE INTO persona(id_persona, tipo_documento, numero_documento, nombres, apellidos)
  VALUES(1, 'DNI', '00000001', 'Administrador', 'General');

INSERT IGNORE INTO empleado(id_empleado, id_persona, codigo_empleado, cargo, fecha_contratacion)
  VALUES(1, 1, 'EMP-001', 'Jefe de Biblioteca', CURDATE());

INSERT IGNORE INTO bibliotecario(id_bibliotecario, id_empleado)
  VALUES(1, 1);

-- Contraseña: admin123 (bcrypt hash)
INSERT IGNORE INTO usuario(id_usuario, id_persona, id_rol, username, password_hash)
  VALUES(1, 1, 1, 'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
-- NOTA: el hash corresponde a 'admin123'. Cámbialo en producción.

-- Configuración del sistema
INSERT IGNORE INTO configuracion(clave, valor, descripcion) VALUES
  ('nombre_biblioteca',     'Biblioteca Municipal',  'Nombre de la biblioteca'),
  ('max_dias_reserva',      '3',                     'Días máximos que se guarda una reserva'),
  ('moneda',                'S/',                    'Símbolo de moneda local'),
  ('correo_notificaciones', 'biblio@example.com',    'Correo para envío de notificaciones');

-- Autores de muestra
INSERT IGNORE INTO autor(nombres, apellidos, nacionalidad) VALUES
  ('José María', 'Arguedas',    'Peruana'),
  ('Mario',      'Vargas Llosa','Peruana'),
  ('Julio',      'Cortázar',    'Argentina'),
  ('Jorge Luis', 'Borges',      'Argentina'),
  ('Gabriel',    'García Márquez', 'Colombiana');

-- Editorial de muestra
INSERT IGNORE INTO editorial(nombre, pais) VALUES
  ('Alfaguara', 'España'),
  ('Planeta',   'España'),
  ('Losada',    'Argentina');

-- Categorías de muestra
INSERT IGNORE INTO categoria(nombre) VALUES
  ('Literatura'),('Ciencia'),('Historia'),('Tecnología'),('Arte'),('Filosofía');

-- Libros de muestra
INSERT IGNORE INTO libro(id_libro, titulo, id_editorial, anio_publicacion, idioma) VALUES
  (1, 'Los ríos profundos',           1, 1958, 'Español'),
  (2, 'Conversación en La Catedral',  1, 1969, 'Español'),
  (3, 'Rayuela',                      3, 1963, 'Español'),
  (4, 'Ficciones',                    3, 1944, 'Español'),
  (5, 'Cien años de soledad',         1, 1967, 'Español');

INSERT IGNORE INTO libro_autor VALUES(1,1),(2,2),(3,3),(4,4),(5,5);
INSERT IGNORE INTO libro_categoria VALUES(1,1),(2,1),(3,1),(4,1),(5,1);

-- Ejemplares de muestra
INSERT IGNORE INTO ejemplar(id_libro, codigo_barras, fecha_adquisicion) VALUES
  (1,'L00001-01',CURDATE()),(1,'L00001-02',CURDATE()),
  (2,'L00002-01',CURDATE()),
  (3,'L00003-01',CURDATE()),(3,'L00003-02',CURDATE()),
  (4,'L00004-01',CURDATE()),(4,'L00004-02',CURDATE()),(4,'L00004-03',CURDATE()),
  (5,'L00005-01',CURDATE()),(5,'L00005-02',CURDATE());

-- Lectores de muestra
INSERT IGNORE INTO persona(id_persona, tipo_documento, numero_documento, nombres, apellidos, correo) VALUES
  (2, 'DNI', '70000001', 'María',  'López',  'maria@example.com'),
  (3, 'DNI', '70000002', 'Juan',   'Pérez',  'juan@example.com'),
  (4, 'DNI', '70000003', 'Ana',    'Torres', 'ana@example.com');

INSERT IGNORE INTO lector(id_persona, id_tipo_lector, codigo_lector, fecha_inscripcion, fecha_vencimiento) VALUES
  (2, 1, 'LEC-001', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
  (3, 2, 'LEC-002', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
  (4, 1, 'LEC-003', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR));
