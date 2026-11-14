import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function InicioPublico() {
  const [stats,      setStats]      = useState(null);
  const [destacados, setDestacados] = useState([]);
  const [search,     setSearch]     = useState('');
  const navigate = useNavigate();
  const { isLector, lectorData, logoutLector } = useAuth();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark_mode') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('dark_mode', 'true');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('dark_mode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    axios.get('/api/publico/stats').then(r => setStats(r.data)).catch(() => {});
    axios.get('/api/publico/destacados').then(r => setDestacados(r.data)).catch(() => {});
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    if (search.trim()) navigate(`/catalogo?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="pub-page">
      {/* Navbar pública */}
      <nav className="pub-nav">
        <div className="pub-container pub-nav-inner">
          <Link to="/" className="pub-nav-brand">Biblioteca</Link>
          <div className="pub-nav-links">
            <Link to="/"            className="pub-nav-link active">Inicio</Link>
            <Link to="/catalogo"    className="pub-nav-link">Catálogo</Link>
            {isLector ? (
              <>
                <Link to="/mi-biblioteca" className="pub-nav-link" style={{ fontWeight: 600 }}>
                  👤 {lectorData?.nombre?.split(' ')[0]}
                </Link>
                <button
                  className="pub-nav-link pub-nav-login"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => logoutLector()}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link to="/lector-login" className="pub-nav-link pub-nav-login">Mi biblioteca</Link>
            )}
            <button
              className="btn-theme-toggle"
              onClick={() => setDarkMode(d => !d)}
              title="Cambiar tema"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pub-hero">
        <div className="pub-hero-content">
          <div className="pub-hero-badge">Biblioteca Municipal</div>
          <h1 className="pub-hero-title">
            Tu puerta al<br/>
            <span className="pub-hero-accent">conocimiento</span>
          </h1>
          <p className="pub-hero-sub">
            Explora miles de libros, encuentra tu próxima lectura y descubre
            un mundo de ideas en nuestra biblioteca.
          </p>

          {/* Barra de búsqueda */}
          <form className="pub-search-bar" onSubmit={handleSearch}>
            <svg className="pub-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              className="pub-search-input"
              placeholder="Busca por título, autor o ISBN…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="pub-search-btn">Buscar</button>
          </form>

          <div className="pub-hero-links">
            <Link to="/catalogo" className="pub-btn-primary">Ver catálogo completo</Link>
            <Link to="/lector-login" className="pub-btn-ghost">Mi biblioteca</Link>
          </div>
        </div>

        {/* Imagen real en el hero con 3D tilt */}
        <div className="pub-hero-deco" aria-hidden="true">
          <div style={{
            width: '320px', height: '320px', borderRadius: '32px', overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.2)',
            transform: 'perspective(1000px) rotateY(-10deg) rotateX(10deg)',
            transition: 'transform 0.4s ease'
          }}>
            <img
              src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=600&auto=format&fit=crop"
              alt="Biblioteca y libros"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* ── ESTADÍSTICAS ─────────────────────────────────── */}
      {stats && (
        <section className="pub-stats">
          <div className="pub-container">
            {[
              { val: stats.total_libros,   lbl: 'Títulos disponibles', delay: '0.05s' },
              { val: stats.total_autores,  lbl: 'Autores registrados', delay: '0.1s' },
              { val: stats.disponibles,    lbl: 'Ejemplares libres',   delay: '0.15s' },
              { val: stats.total_lectores, lbl: 'Lectores activos',    delay: '0.2s' },
            ].map(s => (
              <div key={s.lbl} className="pub-stat-card" style={{ animationDelay: s.delay }}>
                <strong className="pub-stat-val">{s.val}</strong>
                <span className="pub-stat-lbl">{s.lbl}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── LIBROS DESTACADOS ────────────────────────────── */}
      <section className="pub-section pub-container">
        <div className="pub-section-header">
          <h2 className="pub-section-title">Libros destacados</h2>
          <Link to="/catalogo" className="pub-link-more">Ver todos →</Link>
        </div>

        <div className="pub-books-grid">
          {destacados.map((libro, index) => (
            <Link
              to={`/libro/${libro.id_libro}`}
              key={libro.id_libro}
              className="pub-book-card"
              style={{ animationDelay: `${(index % 4) * 0.08}s` }}
            >
              <div className="pub-book-cover">
                <img
                  src={libro.portada_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop"}
                  alt={`Portada de ${libro.titulo}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div className="pub-book-info">
                <h3 className="pub-book-title">{libro.titulo}</h3>
                <p className="pub-book-author">{libro.autores || 'Autor desconocido'}</p>
                <div className="pub-book-meta">
                  {libro.anio_publicacion && <span>{libro.anio_publicacion}</span>}
                  <span className={`pub-badge ${libro.disponibles > 0 ? 'pub-badge-green' : 'pub-badge-red'}`}>
                    {libro.disponibles > 0 ? `${libro.disponibles} disponible${libro.disponibles > 1 ? 's' : ''}` : 'No disponible'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="pub-cta">
        <div className="pub-container pub-cta-inner">
          <div>
            <h2>¿Eres miembro de la biblioteca?</h2>
            <p>Accede a tu portal para ver tus préstamos, historial y multas.</p>
          </div>
          <Link to="/lector-login" className="pub-btn-primary pub-btn-lg">Acceder a mi biblioteca →</Link>
        </div>
      </section>

      <footer className="pub-footer">
        <div className="pub-container">
          <span>Biblioteca Municipal — Sistema de Gestión Bibliotecaria</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
