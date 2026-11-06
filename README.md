# 📚 Sistema de Gestión Bibliotecaria

Aplicación web completa para gestión de una biblioteca.  
**Stack:** React + Node.js / Express + MySQL

---

## 🗂 Estructura del proyecto

```
biblioteca-app/
├── backend/
│   ├── database/
│   │   └── schema.sql          ← Script MySQL (23 tablas + datos seed)
│   ├── src/
│   │   ├── config/database.js  ← Conexión MySQL (pool)
│   │   ├── middleware/
│   │   │   ├── auth.js         ← Verificación JWT
│   │   │   └── errorHandler.js ← Manejo global de errores
│   │   ├── routes/
│   │   │   ├── auth.js         ← POST /api/auth/login
│   │   │   ├── libros.js       ← CRUD libros
│   │   │   ├── lectores.js     ← CRUD lectores
│   │   │   ├── prestamos.js    ← Préstamos, devoluciones, renovaciones
│   │   │   ├── multas.js       ← Listado y pago de multas
│   │   │   ├── reportes.js     ← Dashboard y estadísticas
│   │   │   └── catalogo.js     ← Autores, editoriales, categorías
│   │   └── server.js           ← Punto de entrada Express
│   ├── .env                    ← Variables de entorno
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx      ← Navegación responsiva
    │   │   └── Modal.jsx       ← Modal genérico reutilizable
    │   ├── context/
    │   │   └── AuthContext.jsx ← Estado global de autenticación
    │   ├── hooks/
    │   │   └── useApi.js       ← Hook para peticiones HTTP
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── LibrosPage.jsx
    │   │   ├── LectoresPage.jsx
    │   │   ├── PrestamosPage.jsx
    │   │   ├── MultasPage.jsx
    │   │   └── ReportesPage.jsx
    │   ├── services/api.js     ← Cliente axios con interceptores JWT
    │   ├── App.jsx             ← Rutas y protección de sesión
    │   ├── main.jsx
    │   └── index.css           ← Estilos globales responsivos
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 18.x           |
| npm         | 9.x            |
| MySQL       | 8.0            |

---

## 🚀 Instalación paso a paso

### 1. Crear la base de datos en MySQL

Abre **MySQL Workbench** o la consola de MySQL y ejecuta:

```sql
SOURCE C:/ruta/a/biblioteca-app/backend/database/schema.sql;
```

O también:
```bash
mysql -u root -p < backend/database/schema.sql
```

Esto crea la base de datos `biblioteca_db` con todas las tablas y datos iniciales.

---

### 2. Configurar variables de entorno del backend

Edita el archivo `backend/.env`:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=biblioteca_db
JWT_SECRET=cambia_este_secreto_en_produccion
JWT_EXPIRES=24h
```

---

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 4. Iniciar el backend

```bash
# Modo desarrollo (reinicio automático):
npm run dev

# Modo producción:
npm start
```

El servidor estará disponible en: `http://localhost:3001`

---

### 5. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

### 6. Iniciar el frontend

```bash
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

---

## 🔑 Credenciales por defecto

| Campo    | Valor     |
|----------|-----------|
| Usuario  | `admin`   |
| Contraseña | `admin123` |

> ⚠️ Cambia la contraseña después de la primera entrada.

---

## 📋 Funcionalidades del sistema

### 📖 Libros
- Registrar libros con autores, editorial, categorías y ejemplares
- Búsqueda por título, autor o ISBN
- Editar datos del libro
- Dar de baja libros (baja lógica)

### 👥 Lectores
- Registrar lectores con tipo (Estudiante / Docente / Usuario externo)
- Cada tipo tiene política de préstamo distinta (max. libros, días, multa/día)
- Búsqueda por nombre, DNI o código
- Editar y dar de baja lectores

### 🔄 Préstamos
- Registrar préstamos (selección de lector + ejemplares disponibles)
- Validación automática de límites por tipo de lector
- Registrar devoluciones (buen estado / dañado / perdido)
- Renovación de préstamos (hasta el máximo permitido)
- Historial de todos los préstamos

### 💰 Multas
- Generación automática al devolver con retraso
- Filtrado por estado (Pendiente / Pagada)
- Registrar pago de multas
- Resumen de montos pendientes

### 📈 Reportes / Dashboard
- Contadores en tiempo real (libros, préstamos, multas, lectores)
- Top 5 libros más prestados
- Inventario de ejemplares por estado

---

## 🗄️ Base de datos — Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `persona` | Datos personales de cualquier individuo |
| `lector` | Lectores registrados en la biblioteca |
| `tipo_lector` | Tipos: Estudiante, Docente, Usuario externo |
| `politica_prestamo` | Límites y multas por tipo de lector |
| `libro` | Catálogo de libros |
| `autor` | Autores (relación N:M con libro) |
| `editorial` | Editoriales |
| `categoria` | Categorías (relación N:M con libro) |
| `ejemplar` | Copias físicas de cada libro |
| `prestamo` | Cabecera del préstamo |
| `detalle_prestamo` | Línea por cada ejemplar prestado |
| `devolucion` | Registro de devoluciones |
| `renovacion` | Historial de renovaciones |
| `multa` | Multas generadas por retraso |
| `reserva` | Reservas de libros |
| `historial_actividad` | Auditoría de acciones |
| `configuracion` | Parámetros del sistema |

---

## 🌐 Endpoints principales de la API

```
POST   /api/auth/login
GET    /api/libros
POST   /api/libros
PUT    /api/libros/:id
DELETE /api/libros/:id
GET    /api/lectores
POST   /api/lectores
PUT    /api/lectores/:id
DELETE /api/lectores/:id
GET    /api/prestamos
POST   /api/prestamos
POST   /api/prestamos/devolver/:id
POST   /api/prestamos/renovar/:id
GET    /api/multas
PATCH  /api/multas/:id/pagar
GET    /api/reportes/dashboard
GET    /api/catalogo/tipos-lector
GET    /api/catalogo/ejemplares-disponibles
```

---

## 👨‍💻 Tecnologías utilizadas

**Frontend**
- React 18 + React Router 6
- Vite (bundler)
- Axios (cliente HTTP)
- CSS personalizado responsivo

**Backend**
- Node.js + Express 4
- mysql2 (driver MySQL)
- jsonwebtoken (autenticación JWT)
- bcryptjs (hash de contraseñas)
- dotenv, cors

**Base de datos**
- MySQL 8.0
- 23 tablas relacionadas con claves primarias y foráneas
- Datos seed incluidos

---

## 📌 Reglas de negocio implementadas

| RN | Descripción |
|----|-------------|
| RN01 | Solo lectores activos pueden recibir préstamos |
| RN02 | La inscripción del lector no debe estar vencida |
| RN03 | Solo se prestan ejemplares en estado DISPONIBLE |
| RN04 | No se permiten préstamos duplicados del mismo ejemplar |
| RN06 | Límite de libros simultáneos por tipo de lector |
| RN07 | Días de préstamo definidos por tipo de lector |
| RN08 | Registro obligatorio de devolución |
| RN09 | Actualización del estado del ejemplar al devolver |
| RN11 | Límite de renovaciones por política del tipo de lector |
| RN14 | Generación automática de multa si hay retraso |
