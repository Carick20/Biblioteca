# 📚 Sistema de Gestión Bibliotecaria

Aplicación web completa para la gestión integral de bibliotecas, con panel administrativo y portal público para lectores.  
**Stack:** React 18 + Vite · Node.js / Express · MySQL 8 · Multer

---

## 🗂 Estructura del proyecto

```
Biblioteca/
├── backend/
│   ├── database/
│   │   └── schema.sql              ← Script MySQL (23 tablas + datos seed)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js         ← Pool de conexiones MySQL (mysql2)
│   │   ├── controllers/
│   │   │   ├── crud.factory.js     ← Fábrica de controladores CRUD genéricos
│   │   │   ├── libros.controller.js
│   │   │   └── prestamos.controller.js
│   │   ├── middleware/
│   │   │   └── auth.js             ← Verificación JWT (admin / lector)
│   │   ├── middlewares/
│   │   │   ├── errorHandler.js     ← Manejo global de errores
│   │   │   └── validaciones.js     ← Validaciones de entrada
│   │   ├── routes/
│   │   │   ├── auth.js             ← Login admin · Registro y login de lectores
│   │   │   ├── catalogo.js         ← Catálogo general, géneros, editoriales
│   │   │   ├── lectores.js         ← CRUD de lectores (Admin)
│   │   │   ├── libros.js           ← CRUD de libros y ejemplares (Admin)
│   │   │   ├── miBiblioteca.js     ← Portal del lector: préstamos, historial, multas
│   │   │   ├── multas.js           ← Gestión y pago de multas
│   │   │   ├── prestamos.js        ← Gestión de préstamos y devoluciones
│   │   │   ├── publico.js          ← Catálogo y búsqueda pública de libros
│   │   │   └── reportes.js         ← Dashboard, estadísticas y métricas
│   │   ├── init_db.js              ← Crea tablas automáticamente al arrancar
│   │   └── server.js               ← Punto de entrada Express
│   ├── uploads/
│   │   └── portadas/               ← Imágenes de portadas subidas con Multer
│   ├── .env.example                ← Plantilla de variables de entorno
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx           ← Barra de navegación del panel admin
    │   │   └── Modal.jsx            ← Modal genérico reutilizable
    │   ├── context/
    │   │   └── AuthContext.jsx      ← Estado global de autenticación (Admin y Lector)
    │   ├── pages/
    │   │   ├── CatalogoPublico.jsx  ← Catálogo abierto al público con filtros
    │   │   ├── DashboardPage.jsx    ← Métricas y estadísticas generales
    │   │   ├── DetalleLibro.jsx     ← Ficha detallada + botón solicitar préstamo
    │   │   ├── InicioPublico.jsx    ← Página de bienvenida pública
    │   │   ├── LectorLoginPage.jsx  ← Inicio de sesión para lectores
    │   │   ├── LectorRegisterPage.jsx ← Registro de nuevos lectores
    │   │   ├── LectoresPage.jsx     ← Gestión de lectores (Admin)
    │   │   ├── LibrosPage.jsx       ← Gestión de libros y ejemplares (Admin)
    │   │   ├── LoginPage.jsx        ← Inicio de sesión de administradores
    │   │   ├── MiBibliotecaPage.jsx ← Panel personal del lector
    │   │   ├── MultasPage.jsx       ← Control de multas y pagos (Admin)
    │   │   ├── PrestamosPage.jsx    ← Gestión de préstamos y devoluciones
    │   │   └── ReportesPage.jsx     ← Reportes avanzados
    │   ├── services/
    │   │   └── api.js               ← Cliente Axios con interceptores JWT
    │   ├── App.jsx                  ← Rutas y guards de sesión (Admin / Lector)
    │   └── index.css                ← Estilos globales (tema iOS, dark mode)
    ├── vite.config.js               ← Proxy /api → localhost:3001
    └── package.json
```

---

## ⚙️ Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18.x           |
| npm         | 9.x            |
| MySQL       | 8.0            |

> Se puede usar **Laragon** en Windows, que incluye MySQL 8 y permite instalar Node.js fácilmente.

---

## 🚀 Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/Carick20/Biblioteca.git
cd Biblioteca
```

---

### 2. Configurar la Base de Datos

**Opción A — Importar el dump completo** (recomendado, incluye datos de prueba):

```bash
mysql -u root < asdfg.sql
```

O abriendo `asdfg.sql` desde **HeidiSQL** (Laragon) o **MySQL Workbench**.

**Opción B — Solo el esquema**, sin datos de prueba:

```bash
mysql -u root < backend/database/schema.sql
```

---

### 3. Configurar variables de entorno del backend

Crea el archivo `backend/.env` (no está en el repositorio por seguridad):

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=biblioteca_db
JWT_SECRET=una_clave_secreta_larga
JWT_EXPIRES=24h
```

> En Laragon la contraseña de MySQL es vacía por defecto.

---

### 4. Instalar dependencias e iniciar el Backend

```bash
cd backend
npm install
npm run dev        # desarrollo con recarga automática (nodemon)
# o
npm start          # producción
```

El backend queda disponible en `http://localhost:3001`.

---

### 5. Instalar dependencias e iniciar el Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

> El frontend redirige automáticamente las peticiones `/api/*` al backend mediante el proxy configurado en `vite.config.js`.

---

## 🌐 Arquitectura del proyecto

### Servicios

| Servicio | Tecnología | Puerto |
|----------|-----------|--------|
| Frontend | React 18 + Vite | 5173 |
| Backend  | Node.js + Express | 3001 |
| Base de datos | MySQL 8 (Laragon) | 3306 |

### Flujo de comunicación

```
Navegador (:5173)  →  proxy Vite  →  API Express (:3001)  →  MySQL (:3306)
```

### Proxy Vite (`vite.config.js`)

Redirige en desarrollo todas las llamadas `/api/*` y `/uploads/*` al backend, evitando problemas de CORS:

```js
proxy: {
  '/api':     { target: 'http://localhost:3001', changeOrigin: true },
  '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
}
```

---

## 🔑 Credenciales por defecto

### Panel Administrativo
- **Usuario:** `admin`
- **Contraseña:** `admin123`

### Portal del Lector
Los lectores se registran desde `/lector-registro` con sus datos personales. El sistema genera automáticamente un código de lector (`LEC-0001`, `LEC-0002`, …).

---

## 📋 Funcionalidades principales

### 🌐 Portal público y de lectores
- Catálogo público con búsqueda y filtros por categoría, sin necesidad de cuenta.
- **Registro de lector:** cualquier persona puede crear su cuenta desde el portal.
- **Portal del lector (`/mi-biblioteca`):** préstamos activos, historial, multas y perfil personal.
- **Solicitar préstamo** directamente desde la ficha de un libro si hay ejemplares disponibles.
- Dark mode persistente en todas las páginas públicas.

### 📖 Gestión de libros (Admin)
- CRUD de libros, autores, editoriales y categorías.
- Administración de ejemplares físicos vinculados a cada libro.
- Subida de imágenes de portada con Multer (`backend/uploads/portadas/`).

### 👥 Gestión de lectores (Admin)
- Registro y edición de lectores con clasificación por tipo (Estudiante, Docente, Usuario Externo).
- Políticas de préstamo diferenciadas por tipo: días permitidos, límite de libros y multa diaria.

### 🔄 Préstamos y devoluciones (Admin)
- Registro de préstamos con validación de políticas y disponibilidad de ejemplares.
- Devoluciones con estados: bueno, dañado, perdido.
- Renovación de préstamos dentro del límite permitido.

### 💰 Multas y reportes (Admin)
- Generación automática de multas por retraso.
- Registro de pagos y control de estados (Pendiente / Pagada / Condonada).
- Dashboard con estadísticas y reportes en tiempo real.

---

## 🌐 Endpoints principales de la API

```
# Autenticación
POST   /api/auth/login                    ← Login administrador
POST   /api/auth/lector-login             ← Login de lectores (correo + contraseña)
POST   /api/auth/lector-register          ← Registro de nuevo lector

# Catálogo público (sin autenticación)
GET    /api/publico/libros                ← Listado con búsqueda y filtros
GET    /api/publico/libros/:id            ← Detalle de un libro
GET    /api/publico/categorias            ← Listado de categorías
GET    /api/publico/stats                 ← Estadísticas públicas

# Portal del lector (token de lector requerido)
GET    /api/mi-biblioteca/prestamos       ← Préstamos activos
GET    /api/mi-biblioteca/historial       ← Historial completo
GET    /api/mi-biblioteca/multas          ← Multas del lector
GET    /api/mi-biblioteca/perfil          ← Datos del perfil
POST   /api/mi-biblioteca/solicitar-prestamo ← Solicitar préstamo de un libro

# Libros (Admin)
GET    /api/libros
POST   /api/libros                        ← multipart/form-data (portada incluida)
PUT    /api/libros/:id
DELETE /api/libros/:id

# Lectores (Admin)
GET    /api/lectores
POST   /api/lectores
PUT    /api/lectores/:id
DELETE /api/lectores/:id

# Préstamos (Admin)
GET    /api/prestamos
POST   /api/prestamos
POST   /api/prestamos/devolver/:id
POST   /api/prestamos/renovar/:id

# Multas (Admin)
GET    /api/multas
PATCH  /api/multas/:id/pagar

# Reportes (Admin)
GET    /api/reportes/dashboard
```

---

## 🗄️ Base de datos — Tablas principales

Esquema relacional de **23 tablas**:

- `persona`, `lector`, `tipo_lector`, `politica_prestamo`
- `libro`, `autor`, `editorial`, `categoria`, `libro_autor`, `libro_categoria`, `ejemplar`
- `prestamo`, `detalle_prestamo`, `devolucion`, `renovacion`
- `multa`, `reserva`, `historial_actividad`, `configuracion`
- `rol`, `usuario`, `empleado`, `bibliotecario`

---

## 👨‍💻 Tecnologías utilizadas

**Frontend**
- React 18 · React Router 6 · Vite 5
- Axios 1.7 con interceptores JWT (sesiones separadas admin / lector)
- CSS propio con tema iOS, glassmorphism y dark mode

**Backend**
- Node.js · Express 4
- mysql2 3.9 (pool de conexiones)
- jsonwebtoken 9 · bcryptjs 2.4
- Multer 1.4 (subida de portadas)
- nodemon (desarrollo) · dotenv · cors

---

## 📌 Reglas de negocio clave

- Solo lectores con estado `ACTIVO` e inscripción vigente pueden solicitar préstamos.
- Solo se prestan ejemplares con estado `DISPONIBLE`.
- Los límites de libros simultáneos y días de préstamo dependen del `tipo_lector` y su `politica_prestamo`.
- No se pueden solicitar préstamos si hay multas pendientes o préstamos vencidos sin devolver.
- Se generan multas automáticamente por cada día de retraso en la devolución.
- Máximo de renovaciones configurado por tipo de lector.
