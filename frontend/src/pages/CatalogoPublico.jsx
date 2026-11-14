import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function CatalogoPublico() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [libros,      setLibros]      = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState(searchParams.get('q') || '');
  const [catSel,      setCatSel]      = useState('');
  const [page,        setPage]        = useState(1);
  const LIMIT = 12;

  const { showToast } = useToast();
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

  const fetchLibros = useCallback(async (q, cat, pg) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/publico/libros', {
        params: { q, categoria: cat, page: pg, limit: LIMIT }
      });
      setLibros(data.data || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Error al cargar el catálogo de libros', 'error');
      setLibros([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    axios.get('/api/publico/categorias').then(r => setCategorias(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLibros(query, catSel, page);
    setSearchParams(query ? { q: query } : {});
  }, [query, catSel, page, fetchLibros, setSearchParams]);

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    fetchLibros(query, catSel, 1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="pub-page">
      {/* Navbar pública */}
      <nav className="pub-nav">
        <div className="pub-container pub-nav-inner">
          <Link to="/" className="pub-nav-brand">Biblioteca</Link>
          <div className="pub-nav-links">
            <Link to="/"            className="pub-nav-link">Inicio</Link>
            <Link to="/catalogo"    className="pub-nav-link active">Catálogo</Link>
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

      <div className="pub-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        {/* Cabecera */}
        <div className="pub-cat-header">
          <h1 className="pub-cat-title">Catálogo de libros</h1>
          <p className="pub-cat-sub">{total} título{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Búsqueda + filtros */}
        <div className="pub-cat-controls">
          <form className="pub-cat-search" onSubmit={handleSearch}>
            <svg className="pub-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              className="pub-search-input"
              placeholder="Buscar por título, autor o ISBN…"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
            />
            {query && (
              <button type="button" className="pub-search-clear"
                onClick={() => { setQuery(''); setCatSel(''); setPage(1); }}>✕</button>
            )}
            <button type="submit" className="pub-search-btn">Buscar</button>
          </form>

          {/* Filtro por categoría */}
          <div className="pub-cat-filters">
            <button
              className={`pub-filter-btn ${catSel === '' ? 'active' : ''}`}
              onClick={() => { setCatSel(''); setPage(1); }}
            >Todas</button>
            {categorias.map(c => (
              <button key={c.id_categoria}
                className={`pub-filter-btn ${catSel === c.nombre ? 'active' : ''}`}
                onClick={() => { setCatSel(c.nombre); setPage(1); }}
              >
                {c.nombre} <span className="pub-filter-count">({c.total})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grid de libros o Skeleton Shimmer Loaders */}
        {loading ? (
          <div className="pub-books-grid pub-books-grid-lg">
            {[1,2,3,4,5,6,7,8].map(n => (
              <div key={n} className="skeleton-card">
                <div className="skeleton-line skeleton-cover"></div>
                <div className="skeleton-line skeleton-title"></div>
                <div className="skeleton-line skeleton-sub"></div>
              </div>
            ))}
          </div>
        ) : libros.length === 0 ? (
          <div className="pub-empty">
            <p>No se encontraron libros con esos criterios.</p>
            <button className="pub-btn-primary" onClick={() => { setQuery(''); setCatSel(''); setPage(1); }}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="pub-books-grid pub-books-grid-lg">
            {libros.map((libro, index) => (
              <Link
                to={`/libro/${libro.id_libro}`}
                key={libro.id_libro}
                className="pub-book-card"
                style={{ animationDelay: `${(index % 6) * 0.05}s` }}
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
                  {libro.editorial && <p className="pub-book-editorial">{libro.editorial}</p>}
                  <div className="pub-book-meta">
                    {libro.anio_publicacion && <span>{libro.anio_publicacion}</span>}
                    <span className={`pub-badge ${libro.disponibles > 0 ? 'pub-badge-green' : 'pub-badge-red'}`}>
                      {libro.disponibles > 0 ? `${libro.disponibles} disp.` : 'No disponible'}
                    </span>
                  </div>
                  {libro.categorias && (
                    <div className="pub-book-cats">
                      {libro.categorias.split(',').slice(0,2).map(c => (
                        <span key={c} className="pub-cat-tag">{c.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="pub-pagination">
            <button className="pub-page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
              ← Anterior
            </button>
            <span className="pub-page-info">Página {page} de {totalPages}</span>
            <button className="pub-page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      <footer className="pub-footer">
        <div className="pub-container">
          <span>Biblioteca Municipal</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
