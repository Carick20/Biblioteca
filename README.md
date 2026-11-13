# 📚 Sistema de Gestión Bibliotecaria

Aplicación web completa y robusta para la gestión integral de bibliotecas, con panel administrativo y portal público/lectores.  
**Stack:** React + Node.js / Express + MySQL + Multer (subida de portadas)

---

## 🗂 Estructura del proyecto

```
Biblioteca/
├── backend/
│   ├── database/
│   │   └── schema.sql          ← Script MySQL (23 tablas + datos seed)
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     ← Conexión MySQL (pool)
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── crud.factory.js ← Fábrica de controladores CRUD genéricos
│   │   │   ├── libros.controller.js
│   │   │   └── prestamos.controller.js
│   │   ├── middleware/
│   │   │   └── auth.js         ← Verificación JWT
│   │   ├── middlewares/
│   │   │   ├── errorHandler.js ← Manejo global de errores
│   │   │   └── validaciones.js ← Validaciones de entrada
│   │   ├── routes/
│   │   │   ├── auth.js         ← Autenticación de administradores
│   │   │   ├── autores.routes.js
│   │   │   ├── catalogo.js     ← Catálogo general, géneros, editoriales
│   │   │   ├── categorias.routes.js
│   │   │   ├── lectores.js     ← CRUD de lectores (Admin)
│   │   │   ├── libros.js / libros.routes.js
│   │   │   ├── miBiblioteca.js ← Portal del lector (préstamos y perfil personal)
│   │   │   ├── multas.js       ← Gestión y pago de multas
│   │   │   ├── prestamos.js / prestamos.routes.js
│   │   │   ├── publico.js      ← Catálogo y búsqueda pública de libros
│   │   │   ├── reportes.js     ← Dashboard, estadísticas y métricas
│   │   │   └── socios.routes.js
│   │   └── server.js           ← Punto de entrada Express
│   ├── uploads/
│   │   └── portadas/           ← Almacenamiento de imágenes de libros
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx      ← Barra de navegación adaptativa
    │   │   └── Modal.jsx       ← Modal genérico reutilizable
    │   ├── context/
    │   │   └── AuthContext.jsx ← Estado global de autenticación (Admin y Lector)
    │   ├── hooks/
    │   │   └── useApi.js       ← Hook para peticiones HTTP
    │   ├── pages/
    │   │   ├── CatalogoPublico.jsx  ← Catálogo abierto al público
    │   │   ├── DashboardPage.jsx    ← Métricas y estadísticas generales
    │   │   ├── DetalleLibro.jsx     ← Ficha detallada de un libro
    │   │   ├── InicioPublico.jsx    ← Página de bienvenida pública
    │   │   ├── LectorLoginPage.jsx  ← Inicio de sesión para lectores
    │   │   ├── LectoresPage.jsx     ← Gestión de lectores (Admin)
    │   │   ├── LibrosPage.jsx       ← Gestión de libros y ejemplares (Admin)
    │   │   ├── LoginPage.jsx        ← Inicio de sesión de administradores
    │   │   ├── MiBibliotecaPage.jsx ← Panel personal del lector
    │   │   ├── MultasPage.jsx       ← Control de multas y pagos (Admin)
    │   │   ├── PrestamosPage.jsx    ← Gestión de préstamos y devoluciones
    │   │   └── ReportesPage.jsx     ← Reportes avanzados
    │   ├── services/
    │   │   └── api.js          ← Cliente Axios con interceptores JWT
    │   ├── App.jsx             ← Rutas principales y protección de sesiones
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
| Node.js     | 18.x o superior |
| npm         | 9.x o superior |
| MySQL       | 8.0 o superior |

---

## 🚀 Instalación paso a paso

### 1. Configurar la Base de Datos en MySQL

Ejecuta el script SQL incluido para crear la base de datos `biblioteca_db` junto con sus 23 tablas y datos iniciales de prueba:

```bash
mysql -u root -p < backend/database/schema.sql
```
O bien importando el archivo `backend/database/schema.sql` desde **MySQL Workbench**.

---

### 2. Configurar variables de entorno del backend

Copia el archivo de ejemplo o crea un archivo `.env` en la carpeta `backend/`:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=biblioteca_db
JWT_SECRET=tu_clave_secreta_jwt_muy_segura
JWT_EXPIRES=24h
```

---

### 3. Instalar dependencias e iniciar el Backend

```bash
cd backend
npm install
# Modo desarrollo con recarga automática:
npm run dev
# O en producción:
npm start
```
El servidor backend correrá en `http://localhost:3001`.

---

### 4. Instalar dependencias e iniciar el Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173`.

---

## 🔑 Credenciales por defecto

### Panel Administrativo
- **Usuario:** `admin`
- **Contraseña:** `admin123`

---

## 📋 Funcionalidades Principales

### 🌐 Portal Público y de Lectores
- **Inicio y Catálogo Público:** Permite a cualquier visitante buscar libros, filtrar por categoría/autor/editorial y ver detalles sin iniciar sesión.
- **Portal del Lector (`Mi Biblioteca`):** Los lectores pueden iniciar sesión con sus credenciales de lector para consultar sus préstamos activos, historial, fechas de devolución y multas pendientes.
- **Subida de Portadas:** Soporte para carga de imágenes de portada de libros mediante `multer` con almacenamiento local en `backend/uploads/portadas/`.

### 📖 Gestión de Libros y Catálogo (Admin)
- Registro y edición de libros, autores, editoriales y categorías.
- Administración de ejemplares físicos vinculados a cada libro.
- Subida y actualización de imágenes de portada.

### 👥 Gestión de Lectores (Admin)
- Registro de lectores vinculados a la tabla de personas.
- Clasificación por tipo de lector (Estudiante, Docente, Usuario Externo) con políticas de préstamo diferenciadas (días permitidos, límite de libros, monto de multa diaria).

### 🔄 Préstamos y Devoluciones (Admin)
- Asignación de préstamos validando políticas de lector y disponibilidad de ejemplares.
- Registro de devoluciones (estado bueno, dañado, perdido).
- Renovación de préstamos dentro del límite permitido.

### 💰 Multas y Reportes (Admin)
- Generación automática de multas por retraso en devoluciones.
- Registro de pagos y control de estados (Pendiente / Pagada).
- Dashboard con estadísticas y reportes en tiempo real.

---

## 🗄️ Base de datos — Tablas principales (`schema.sql`)

El sistema cuenta con un esquema relacional optimizado de **23 tablas**, entre las cuales destacan:
- `persona`, `lector`, `tipo_lector`, `politica_prestamo`
- `libro`, `autor`, `editorial`, `categoria`, `libro_autor`, `libro_categoria`, `ejemplar`
- `prestamo`, `detalle_prestamo`, `devolucion`, `renovacion`
- `multa`, `reserva`, `historial_actividad`, `configuracion`

---

## 🌐 Endpoints principales de la API

```
# Autenticación y Público
POST   /api/auth/login                  # Login administrador
POST   /api/publico/login-lector        # Login de lectores
GET    /api/publico/libros              # Catálogo público de libros
GET    /api/publico/libros/:id          # Detalle de libro público

# Mi Biblioteca (Lector autenticado)
GET    /api/mi-biblioteca/prestamos     # Préstamos del lector actual
GET    /api/mi-biblioteca/multas        # Multas del lector actual

# Gestión Administrativa
GET    /api/libros                      # Listar libros (con soporte de portadas)
POST   /api/libros                      # Crear libro (multipart/form-data con portada)
PUT    /api/libros/:id                  # Actualizar libro
DELETE /api/libros/:id                  # Eliminar/Dar de baja libro

GET    /api/lectores                    # Listar lectores
POST   /api/lectores                    # Crear lector
PUT    /api/lectores/:id                # Actualizar lector
DELETE /api/lectores/:id                # Eliminar lector

GET    /api/prestamos                   # Listar préstamos
POST   /api/prestamos                   # Registrar nuevo préstamo
POST   /api/prestamos/devolver/:id      # Registrar devolución
POST   /api/prestamos/renovar/:id       # Renovar préstamo

GET    /api/multas                      # Listar multas
PATCH  /api/multas/:id/pagar            # Marcar multa como pagada

GET    /api/reportes/dashboard          # Métricas y estadísticas generales
GET    /api/catalogo/...                # Catálogos auxiliares (tipos, categorías, autores)
```

---

## 👨‍💻 Tecnologías Utilizadas

**Frontend:**
- React 18 & React Router 6
- Vite
- Axios (con interceptores para JWT)
- CSS Modularizado y Responsivo

**Backend:**
- Node.js & Express
- MySQL2 (Pool de conexiones)
- JSON Web Token (JWT) & bcryptjs
- Multer (Gestión de subida de archivos/portadas)
- Cors & Dotenv

---

## 📌 Reglas de Negocio Clave

- **RN01:** Solo lectores con estado activo pueden solicitar préstamos.
- **RN02:** La inscripción de la membresía del lector no debe estar vencida.
- **RN03:** Solo se pueden prestar ejemplares con estado `DISPONIBLE`.
- **RN06 & RN07:** Los límites de libros simultáneos y días de préstamo se aplican estrictamente según el `tipo_lector` y su `politica_prestamo`.
- **RN11:** Límite máximo de renovaciones permitidas.
- **RN14:** Generación automática de multas por cada día de retraso en la devolución.
