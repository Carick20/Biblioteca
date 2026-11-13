SET NAMES utf8mb4;
SET time_zone = '-05:00';
SET @OLD_FK_CHECKS = @@foreign_key_checks;
SET foreign_key_checks = 0;
SET SQL_SAFE_UPDATES = 0;

DROP DATABASE IF EXISTS biblioteca_db;

CREATE DATABASE biblioteca_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biblioteca_db;

CREATE TABLE persona (
  id_persona       INT AUTO_INCREMENT PRIMARY KEY,
  tipo_documento   VARCHAR(20)  NOT NULL DEFAULT 'DNI',
  numero_documento VARCHAR(20)  NOT NULL UNIQUE,
  nombres          VARCHAR(100) NOT NULL,
  apellidos        VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE,
  telefono         VARCHAR(20),
  correo           VARCHAR(120),
  direccion        VARCHAR(200),
  fecha_registro   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

CREATE TABLE tipo_lector (
  id_tipo_lector INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(80) NOT NULL UNIQUE,
  descripcion    TEXT,
  estado         VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

CREATE TABLE lector (
  id_lector         INT AUTO_INCREMENT PRIMARY KEY,
  id_persona        INT NOT NULL UNIQUE,
  id_tipo_lector    INT NOT NULL,
  codigo_lector     VARCHAR(30) NOT NULL UNIQUE,
  fecha_inscripcion DATE NOT NULL,
  fecha_vencimiento DATE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_persona)     REFERENCES persona(id_persona)         ON DELETE RESTRICT,
  FOREIGN KEY (id_tipo_lector) REFERENCES tipo_lector(id_tipo_lector) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE empleado (
  id_empleado        INT AUTO_INCREMENT PRIMARY KEY,
  id_persona         INT NOT NULL UNIQUE,
  codigo_empleado    VARCHAR(30)  NOT NULL UNIQUE,
  cargo              VARCHAR(100) NOT NULL,
  fecha_contratacion DATE,
  estado             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE bibliotecario (
  id_bibliotecario   INT AUTO_INCREMENT PRIMARY KEY,
  id_empleado        INT NOT NULL UNIQUE,
  codigo_profesional VARCHAR(30),
  estado             VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE rol (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE usuario (
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

CREATE TABLE autor (
  id_autor         INT AUTO_INCREMENT PRIMARY KEY,
  nombres          VARCHAR(100) NOT NULL,
  apellidos        VARCHAR(100),
  nacionalidad     VARCHAR(80),
  fecha_nacimiento DATE,
  biografia        TEXT
) ENGINE=InnoDB;

CREATE TABLE editorial (
  id_editorial INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL UNIQUE,
  pais         VARCHAR(80),
  telefono     VARCHAR(20),
  correo       VARCHAR(120),
  estado       VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

CREATE TABLE categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL UNIQUE,
  descripcion  TEXT,
  estado       VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

CREATE TABLE libro (
  id_libro         INT AUTO_INCREMENT PRIMARY KEY,
  isbn             VARCHAR(20) UNIQUE,
  titulo           VARCHAR(200) NOT NULL,
  subtitulo        VARCHAR(200),
  id_editorial     INT,
  anio_publicacion YEAR,
  numero_paginas   INT,
  idioma           VARCHAR(50) DEFAULT 'Español',
  descripcion      TEXT,
  portada_url      VARCHAR(500),
  estado           VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
  fecha_registro   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_editorial) REFERENCES editorial(id_editorial) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE libro_autor (
  id_libro INT NOT NULL,
  id_autor INT NOT NULL,
  PRIMARY KEY (id_libro, id_autor),
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro) ON DELETE CASCADE,
  FOREIGN KEY (id_autor) REFERENCES autor(id_autor) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE libro_categoria (
  id_libro     INT NOT NULL,
  id_categoria INT NOT NULL,
  PRIMARY KEY (id_libro, id_categoria),
  FOREIGN KEY (id_libro)     REFERENCES libro(id_libro)         ON DELETE CASCADE,
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ejemplar (
  id_ejemplar       INT AUTO_INCREMENT PRIMARY KEY,
  id_libro          INT NOT NULL,
  ubicacion         VARCHAR(60),
  codigo_barras     VARCHAR(50) NOT NULL UNIQUE,
  fecha_adquisicion DATE,
  costo_adquisicion DECIMAL(10,2),
  estado            VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE',
  FOREIGN KEY (id_libro) REFERENCES libro(id_libro) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE politica_prestamo (
  id_politica      INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo_lector   INT NOT NULL UNIQUE,
  max_libros       INT NOT NULL DEFAULT 3,
  dias_prestamo    INT NOT NULL DEFAULT 7,
  max_renovaciones INT NOT NULL DEFAULT 2,
  dias_renovacion  INT NOT NULL DEFAULT 7,
  multa_por_dia    DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  FOREIGN KEY (id_tipo_lector) REFERENCES tipo_lector(id_tipo_lector) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prestamo (
  id_prestamo      INT AUTO_INCREMENT PRIMARY KEY,
  id_lector        INT NOT NULL,
  id_bibliotecario INT NOT NULL,
  fecha_prestamo   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado           VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  observaciones    TEXT,
  FOREIGN KEY (id_lector)        REFERENCES lector(id_lector)               ON DELETE RESTRICT,
  FOREIGN KEY (id_bibliotecario) REFERENCES bibliotecario(id_bibliotecario) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE detalle_prestamo (
  id_detalle                  INT AUTO_INCREMENT PRIMARY KEY,
  id_prestamo                 INT NOT NULL,
  id_ejemplar                 INT NOT NULL,
  fecha_devolucion_programada DATE NOT NULL,
  estado                      VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo) ON DELETE RESTRICT,
  FOREIGN KEY (id_ejemplar) REFERENCES ejemplar(id_ejemplar) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE devolucion (
  id_devolucion       INT AUTO_INCREMENT PRIMARY KEY,
  id_detalle_prestamo INT NOT NULL UNIQUE,
  id_bibliotecario    INT NOT NULL,
  fecha_devolucion    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado_ejemplar     VARCHAR(30),
  observaciones       TEXT,
  FOREIGN KEY (id_detalle_prestamo) REFERENCES detalle_prestamo(id_detalle)    ON DELETE RESTRICT,
  FOREIGN KEY (id_bibliotecario)    REFERENCES bibliotecario(id_bibliotecario) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE renovacion (
  id_renovacion             INT AUTO_INCREMENT PRIMARY KEY,
  id_detalle_prestamo       INT NOT NULL,
  fecha_renovacion          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_devolucion_anterior DATE NOT NULL,
  nueva_fecha_devolucion    DATE NOT NULL,
  motivo                    VARCHAR(200),
  FOREIGN KEY (id_detalle_prestamo) REFERENCES detalle_prestamo(id_detalle) ON DELETE RESTRICT,
  CHECK (nueva_fecha_devolucion > fecha_devolucion_anterior)
) ENGINE=InnoDB;

CREATE TABLE reserva (
  id_reserva        INT AUTO_INCREMENT PRIMARY KEY,
  id_lector         INT NOT NULL,
  id_libro          INT NOT NULL,
  fecha_reserva     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE,
  estado            VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  FOREIGN KEY (id_lector) REFERENCES lector(id_lector) ON DELETE RESTRICT,
  FOREIGN KEY (id_libro)  REFERENCES libro(id_libro)   ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE multa (
  id_multa         INT AUTO_INCREMENT PRIMARY KEY,
  id_lector        INT NOT NULL,
  id_prestamo      INT NOT NULL,
  concepto         VARCHAR(150) NOT NULL,
  monto            DECIMAL(10,2) NOT NULL,
  fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_pago       DATETIME,
  estado           VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  FOREIGN KEY (id_lector)   REFERENCES lector(id_lector)     ON DELETE RESTRICT,
  FOREIGN KEY (id_prestamo) REFERENCES prestamo(id_prestamo) ON DELETE RESTRICT,
  CHECK (monto >= 0)
) ENGINE=InnoDB;

CREATE TABLE historial_actividad (
  id_historial INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT,
  accion       VARCHAR(100) NOT NULL,
  detalle      TEXT,
  ip_origen    VARCHAR(45),
  fecha        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE configuracion (
  clave       VARCHAR(80) PRIMARY KEY,
  valor       VARCHAR(500) NOT NULL,
  descripcion VARCHAR(200)
) ENGINE=InnoDB;

CREATE INDEX idx_persona_apellidos  ON persona(apellidos, nombres);
CREATE INDEX idx_libro_titulo       ON libro(titulo);
CREATE INDEX idx_ejemplar_libro_est ON ejemplar(id_libro, estado);
CREATE INDEX idx_prestamo_lector    ON prestamo(id_lector, estado);
CREATE INDEX idx_detalle_estado     ON detalle_prestamo(estado, fecha_devolucion_programada);
CREATE INDEX idx_reserva_libro_est  ON reserva(id_libro, estado);
CREATE INDEX idx_multa_lector_est   ON multa(id_lector, estado);

SET foreign_key_checks = @OLD_FK_CHECKS;

-- ======================= DATOS INICIALES =======================

INSERT INTO rol(nombre) VALUES ('ADMIN'), ('BIBLIOTECARIO'), ('CONSULTA');

INSERT INTO tipo_lector(id_tipo_lector, nombre, descripcion) VALUES
  (1, 'Estudiante',      'Alumno de cualquier nivel educativo'),
  (2, 'Docente',         'Profesor o investigador'),
  (3, 'Usuario externo', 'Persona externa a la institución');

INSERT INTO politica_prestamo
  (id_tipo_lector, max_libros, dias_prestamo, max_renovaciones, dias_renovacion, multa_por_dia) VALUES
  (1, 3,  7, 2, 7, 1.00),
  (2, 5, 14, 3, 7, 0.50),
  (3, 2,  7, 1, 7, 2.00);

INSERT INTO persona(id_persona, tipo_documento, numero_documento, nombres, apellidos)
  VALUES (1, 'DNI', '00000001', 'Administrador', 'General');

INSERT INTO empleado(id_empleado, id_persona, codigo_empleado, cargo, fecha_contratacion)
  VALUES (1, 1, 'EMP-001', 'Jefe de Biblioteca', CURDATE());

INSERT INTO bibliotecario(id_bibliotecario, id_empleado) VALUES (1, 1);

-- OJO: este hash equivale a la contraseña "password", no a "admin123".
INSERT INTO usuario(id_usuario, id_persona, id_rol, username, password_hash)
  VALUES (1, 1, 1, 'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

INSERT INTO configuracion(clave, valor, descripcion) VALUES
  ('nombre_biblioteca',     'Biblioteca Municipal', 'Nombre de la biblioteca'),
  ('max_dias_reserva',      '3',                    'Días máximos que se guarda una reserva'),
  ('moneda',                'S/',                   'Símbolo de moneda local'),
  ('correo_notificaciones', 'biblio@example.com',   'Correo para envío de notificaciones');

INSERT INTO autor(id_autor, nombres, apellidos, nacionalidad) VALUES
  (1, 'José María', 'Arguedas',       'Peruana'),
  (2, 'Mario',      'Vargas Llosa',   'Peruana'),
  (3, 'Julio',      'Cortázar',       'Argentina'),
  (4, 'Jorge Luis', 'Borges',         'Argentina'),
  (5, 'Gabriel',    'García Márquez', 'Colombiana');

INSERT INTO editorial(id_editorial, nombre, pais) VALUES
  (1, 'Alfaguara', 'España'),
  (2, 'Planeta',   'España'),
  (3, 'Losada',    'Argentina');

INSERT INTO categoria(id_categoria, nombre) VALUES
  (1, 'Literatura'), (2, 'Ciencia'), (3, 'Historia'),
  (4, 'Tecnología'), (5, 'Arte'),    (6, 'Filosofía');

INSERT INTO libro(id_libro, titulo, id_editorial, anio_publicacion, idioma) VALUES
  (1, 'Los ríos profundos',          1, 1958, 'Español'),
  (2, 'Conversación en La Catedral', 1, 1969, 'Español'),
  (3, 'Rayuela',                     3, 1963, 'Español'),
  (4, 'Ficciones',                   3, 1944, 'Español'),
  (5, 'Cien años de soledad',        1, 1967, 'Español');

INSERT INTO libro_autor(id_libro, id_autor)         VALUES (1,1),(2,2),(3,3),(4,4),(5,5);
INSERT INTO libro_categoria(id_libro, id_categoria) VALUES (1,1),(2,1),(3,1),(4,1),(5,1);

INSERT INTO ejemplar(id_libro, codigo_barras, fecha_adquisicion) VALUES
  (1, 'L00001-01', CURDATE()), (1, 'L00001-02', CURDATE()),
  (2, 'L00002-01', CURDATE()),
  (3, 'L00003-01', CURDATE()), (3, 'L00003-02', CURDATE()),
  (4, 'L00004-01', CURDATE()), (4, 'L00004-02', CURDATE()), (4, 'L00004-03', CURDATE()),
  (5, 'L00005-01', CURDATE()), (5, 'L00005-02', CURDATE());

INSERT INTO persona(id_persona, tipo_documento, numero_documento, nombres, apellidos, correo) VALUES
  (2, 'DNI', '70000001', 'María', 'López',  'maria@example.com'),
  (3, 'DNI', '70000002', 'Juan',  'Pérez',  'juan@example.com'),
  (4, 'DNI', '70000003', 'Ana',   'Torres', 'ana@example.com');

INSERT INTO lector(id_persona, id_tipo_lector, codigo_lector, fecha_inscripcion, fecha_vencimiento) VALUES
  (2, 1, 'LEC-001', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
  (3, 2, 'LEC-002', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR)),
  (4, 1, 'LEC-003', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR));

SELECT 'persona' AS tabla, COUNT(*) AS filas FROM persona
UNION ALL SELECT 'lector',   COUNT(*) FROM lector
UNION ALL SELECT 'libro',    COUNT(*) FROM libro
UNION ALL SELECT 'ejemplar', COUNT(*) FROM ejemplar
UNION ALL SELECT 'usuario',  COUNT(*) FROM usuario;