📚 Sistema de Biblioteca – Aplicación Web con React y Base de Datos

Proyecto grupal – Aplicación web CRUD con React + Node.js/Express + MySQL. Referencia: Guía práctica SENATI (págs. 31–39).

1. Descripción del proyecto
Problemática

La biblioteca gestiona libros, socios y préstamos de forma manual (cuadernos/Excel), lo que genera pérdida de información, libros sin control de devolución y dificultad para saber qué libros están disponibles.

Solución

Una aplicación web que permite registrar, consultar, modificar y eliminar libros, autores, categorías, socios y préstamos, con control automático del stock disponible.

Objetivo

Diseñar e implementar una aplicación web funcional con React (Front end), API REST (Back end) y una base de datos relacional que almacene los datos del sistema (CRUD).

2. Tecnologías
Capa	Tecnología
Front end	React (JavaScript), React Router, Axios, Bootstrap/CSS
Back end	Node.js + Express (API REST)
Base de datos	MySQL
Control de versiones	Git + GitHub
3. Estructura del repositorio
sistema-biblioteca/
├── README.md
├── docs/
│   ├── documento-proyecto.docx
│   ├── diagrama-er.png
│   └── evidencias-crud/
├── database/
│   └── biblioteca.sql
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js
│       ├── config/db.js
│       ├── routes/
│       ├── controllers/
│       └── middlewares/ (validaciones y manejo de errores)
└── frontend/
    ├── package.json
    └── src/
        ├── components/   (Navbar, Tabla, Formulario, Modal, Alerta)
        ├── pages/        (Inicio, Libros, Socios, Prestamos, Autores, Categorias)
        ├── services/     (llamadas a la API)
        ├── App.js
        └── index.js
4. Base de datos (propuesta)

Tablas (5, todas relacionadas):

categorias (id_categoria PK, nombre)
autores (id_autor PK, nombre, nacionalidad)
libros (id_libro PK, titulo, isbn UNIQUE, anio, stock, id_autor FK, id_categoria FK)
socios (id_socio PK, nombre, dni UNIQUE, correo, telefono)
prestamos (id_prestamo PK, id_libro FK, id_socio FK, fecha_prestamo, fecha_devolucion, estado)

Relaciones:

Un autor tiene muchos libros (1:N)
Una categoría tiene muchos libros (1:N)
Un socio tiene muchos préstamos (1:N)
Un libro aparece en muchos préstamos (1:N)

Consultas SQL a incluir: libros con su autor y categoría (JOIN), préstamos activos por socio, libros más prestados (GROUP BY), libros con stock bajo.

Integridad: claves primarias y foráneas, UNIQUE en ISBN y DNI, NOT NULL en campos obligatorios, ON DELETE RESTRICT.

5. Endpoints de la API REST
Recurso	GET	GET /:id	POST	PUT /:id	DELETE /:id
/api/libros	✅	✅	✅	✅	✅
/api/autores	✅	✅	✅	✅	✅
/api/categorias	✅	✅	✅	✅	✅
/api/socios	✅	✅	✅	✅	✅
/api/prestamos	✅	✅	✅	✅ (devolver)	✅
6. 👥 División del trabajo

Sustituye los nombres por los de tu grupo.

🧑‍💻 Integrante 1 – Base de datos y documentación

Responsable de: database/ y docs/

 Redactar el documento con la problemática y descripción del proyecto
 Diseñar el Diagrama Entidad-Relación
 Escribir el script de creación de la BD (biblioteca.sql) con tablas, PK, FK e integridad
 Insertar datos de prueba
 Escribir las consultas SQL (JOIN, GROUP BY, filtros)
 Crear el repositorio en GitHub, proteger la rama main y configurar el .gitignore
 Recopilar las evidencias de las operaciones CRUD (capturas)
 Apoyar en el front: páginas de Autores y Categorías
🧑‍💻 Integrante 2 – Back end (Node.js + Express)

Responsable de: backend/

 Inicializar el proyecto Node y configurar Express, CORS y dotenv
 Configurar la conexión a MySQL (config/db.js)
 Crear rutas y controladores CRUD de libros, autores, categorías, socios y préstamos
 Validación de datos (campos vacíos, formato de DNI/correo, ISBN duplicado)
 Manejo de errores (middleware global, códigos HTTP 400/404/409/500)
 Lógica de préstamos: descontar stock al prestar y devolverlo al devolver
 Probar los endpoints con Postman o Thunder Client y guardar capturas
 Documentar los endpoints
🧑‍💻 Integrante 3 – Front end (React)

Responsable de: frontend/

 Crear el proyecto React e instalar React Router, Axios y Bootstrap
 Componentes reutilizables: Navbar, Tabla, Formulario, Modal de confirmación, Alertas
 Navegación entre páginas con React Router
 Páginas de Libros, Socios y Préstamos (listar, crear, editar, eliminar)
 Formularios con validación (campos obligatorios, formato de correo y DNI)
 Diseño responsivo (Bootstrap/CSS, móvil y escritorio)
 Conectar con la API mediante services/
 Preparar la presentación (diapositivas)
🤝 Tareas compartidas
 Integración front + back + BD y pruebas finales
 Revisión de pull requests entre los tres
 Ensayo y exposición con demostración del sistema (todos exponen una parte)

Si son 4 personas: el Integrante 4 se encarga de las páginas de Autores, Categorías y Préstamos en el front, y de la presentación.

7. Flujo de trabajo con Git
Rama principal: main (solo código estable).
Cada quien trabaja en su rama: feature/bd, feature/backend, feature/frontend.
Commits claros, por ejemplo: feat: agrega CRUD de libros.
Al terminar una tarea, abrir un Pull Request hacia main y que otro integrante lo revise.
Hacer git pull antes de empezar a trabajar cada día.
8. Cronograma sugerido
Etapa	Qué se hace	Responsables
1	Reparto de tareas, repositorio, DER y script SQL	Todos / Int. 1
2	API REST y CRUD; maquetado de componentes	Int. 2 / Int. 3
3	Validaciones, manejo de errores, formularios	Int. 2 / Int. 3
4	Integración, pruebas y evidencias CRUD	Todos
5	Documento final, diapositivas y ensayo	Todos
9. Instalación y ejecución
bash
# 1. Clonar el repositorio
git clone https://github.com/USUARIO/sistema-biblioteca.git
cd sistema-biblioteca

# 2. Base de datos
mysql -u root -p < database/biblioteca.sql

# 3. Backend
cd backend
cp .env.example .env      # completar usuario y contraseña de MySQL
npm install
npm run dev               # http://localhost:3000

# 4. Frontend (otra terminal)
cd frontend
npm install
npm start                 # http://localhost:3001

Variables de entorno (backend/.env):

PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_clave
DB_NAME=biblioteca
10. ✅ Checklist de entregables
 1. Documento con la problemática y el proyecto
 2. Diagrama Entidad-Relación
 3. Script de creación de la base de datos
 4. Código fuente del Front end
 5. Código fuente del Back end
 6. Evidencias de las operaciones CRUD
 7. Repositorio en GitHub
 8. Exposición y demostración del sistema
11. Integrantes
Nombre	Rol
Nombre 1	Base de datos y documentación
Nombre 2	Back end
Nombre 3	Front end