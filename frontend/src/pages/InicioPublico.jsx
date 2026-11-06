import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function InicioPublico() {
  const [stats,      setStats]      = useState(null);
  const [destacados, setDestacados] = useState([]);
  const [search,     setSearch]     = useState('');
  const navigate = useNavigate();

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

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pub-hero">
        <div className="pub-hero-content">
          <div className="pub-hero-badge">📚 Biblioteca Municipal</div>
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
            <span className="pub-search-icon">🔍</span>
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

        {/* Decoración derecha */}
        <div className="pub-hero-deco" aria-hidden="true">
          <div className="pub-deco-stack">
            {['📖','📗','📘','📙','📚'].map((e,i) => (
              <span key={i} className="pub-deco-book" style={{ animationDelay: `${i * 0.3}s` }}>{e}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESTADÍSTICAS ─────────────────────────────────── */}
      {stats && (
        <section className="pub-stats">
          <div className="pub-container">
            {[
              { val: stats.total_libros,   lbl: 'Títulos disponibles', ico: '📖' },
              { val: stats.total_autores,  lbl: 'Autores registrados', ico: '✍️'  },
              { val: stats.disponibles,    lbl: 'Ejemplares libres',   ico: '✅'  },
              { val: stats.total_lectores, lbl: 'Lectores activos',    ico: '👥'  },
            ].map(s => (
              <div key={s.lbl} className="pub-stat-card">
                <span className="pub-stat-icon">{s.ico}</span>
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
          <h2 className="pub-section-title">⭐ Libros destacados</h2>
          <Link to="/catalogo" className="pub-link-more">Ver todos →</Link>
        </div>

        <div className="pub-books-grid">
          {destacados.map(libro => (
            <Link to={`/libro/${libro.id_libro}`} key={libro.id_libro} className="pub-book-card">
              {/* Portada real o fondo de color generado */}
              <div className="pub-book-cover" style={libro.portada_url ? {} : { background: colorFromTitle(libro.titulo) }}>
                {libro.portada_url
                  ? <img
                      src={libro.portada_url}
                      alt={`Portada de ${libro.titulo}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }}
                    />
                  : <span className="pub-book-emoji">📖</span>
                }
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
          <span>📚 Biblioteca Municipal — Sistema de Gestión Bibliotecaria</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

/* Genera un color suave a partir del título */
function colorFromTitle(title) {
  const colors = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'linear-gradient(135deg,#fccb90,#d57eeb)',
    'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
