import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin',           label: '📊 Dashboard', end: true },
  { to: '/admin/libros',    label: '📚 Libros' },
  { to: '/admin/lectores',  label: '👥 Lectores' },
  { to: '/admin/prestamos', label: '🔄 Préstamos' },
  { to: '/admin/multas',    label: '⚠️ Multas' },
  { to: '/admin/reportes',  label: '📈 Reportes' },
];

export default function Navbar() {
  const { adminUser, logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <Link to="/admin" className="navbar-brand">
        <span>📚</span> Biblioteca
      </Link>

      <button
        className="navbar-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Menú"
        aria-expanded={open}
      >
        {open ? '✕' : '☰'}
      </button>

      <div
        className={`navbar-links${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
      >
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-user">
        <span>👤 {adminUser?.nombre ?? adminUser?.username}</span>
        <button className="btn-logout" onClick={handleLogout}>Salir</button>
      </div>
    </nav>
  );
}
