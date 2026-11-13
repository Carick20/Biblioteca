import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// ── Páginas públicas ───────────────────────────────────────────
import InicioPublico    from './pages/InicioPublico';
import CatalogoPublico  from './pages/CatalogoPublico';
import DetalleLibro     from './pages/DetalleLibro';

// ── Autenticación ──────────────────────────────────────────────
import LoginPage        from './pages/LoginPage';        // admin
import LectorLoginPage  from './pages/LectorLoginPage';  // lector

// ── Portal del lector (autenticado como lector) ────────────────
import MiBibliotecaPage from './pages/MiBibliotecaPage';

// ── Panel admin (autenticado como admin) ───────────────────────
import Navbar           from './components/Navbar';
import DashboardPage    from './pages/DashboardPage';
import LibrosPage       from './pages/LibrosPage';
import LectoresPage     from './pages/LectoresPage';
import PrestamosPage    from './pages/PrestamosPage';
import MultasPage       from './pages/MultasPage';
import ReportesPage     from './pages/ReportesPage';

// ─────────────────────────────────────────────────────────────
// Route Guards
// ─────────────────────────────────────────────────────────────

/**
 * AdminRoute — permite el acceso únicamente si existe sesión de admin.
 * Si no, redirige a /login guardando la ruta original en state.from.
 */
function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  const location = useLocation();
  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

/**
 * LectorRoute — permite el acceso únicamente si existe sesión de lector.
 * Si no, redirige a /lector-login guardando la ruta original en state.from.
 */
function LectorRoute({ children }) {
  const { isLector } = useAuth();
  const location = useLocation();
  if (!isLector) {
    return <Navigate to="/lector-login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

/**
 * AdminAlreadyLogged — si ya está logueado como admin, va directo al panel.
 */
function AdminAlreadyLogged({ children }) {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

/**
 * LectorAlreadyLogged — si ya está logueado como lector, va directo a su portal.
 */
function LectorAlreadyLogged({ children }) {
  const { isLector } = useAuth();
  if (isLector) return <Navigate to="/mi-biblioteca" replace />;
  return children;
}

/** Layout del panel administrativo (con navbar lateral/superior) */
function AdminLayout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Árbol de rutas
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>

      {/* ══ RUTAS PÚBLICAS (sin autenticación) ══════════════ */}
      <Route path="/"           element={<InicioPublico />} />
      <Route path="/catalogo"   element={<CatalogoPublico />} />
      <Route path="/libro/:id"  element={<DetalleLibro />} />

      {/* ══ LOGIN ADMIN — redirige si ya autenticado ════════ */}
      <Route path="/login" element={
        <AdminAlreadyLogged><LoginPage /></AdminAlreadyLogged>
      } />

      {/* ══ LOGIN LECTOR — redirige si ya autenticado ═══════ */}
      <Route path="/lector-login" element={
        <LectorAlreadyLogged><LectorLoginPage /></LectorAlreadyLogged>
      } />

      {/* ══ PORTAL DEL LECTOR ═══════════════════════════════
          Sólo accesible con token de lector.
          Un administrador NO puede entrar aquí con su token.    */}
      <Route path="/mi-biblioteca" element={
        <LectorRoute><MiBibliotecaPage /></LectorRoute>
      } />

      {/* ══ PANEL DE ADMINISTRACIÓN ═════════════════════════
          Sólo accesible con token de admin.
          Un lector NO puede entrar aquí con su token.           */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout><DashboardPage /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/libros" element={
        <AdminRoute>
          <AdminLayout><LibrosPage /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/lectores" element={
        <AdminRoute>
          <AdminLayout><LectoresPage /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/prestamos" element={
        <AdminRoute>
          <AdminLayout><PrestamosPage /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/multas" element={
        <AdminRoute>
          <AdminLayout><MultasPage /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/reportes" element={
        <AdminRoute>
          <AdminLayout><ReportesPage /></AdminLayout>
        </AdminRoute>
      } />

      {/* ══ FALLBACK — cualquier ruta desconocida ════════════ */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
