import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

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

  const fetchLibros = useCallback(async (q, cat, pg) => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/publico/libros', {
        params: { q, categoria: cat, page: pg, limit: LIMIT }
      });
      setLibros(data.data || []);
      setTotal(data.total || 0);
    } catch { setLibros([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    axios.get('/api/publico/categorias').then(r => setCategorias(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLibros(query, catSel, page);
    setSearchParams(query ? { q: query } : {});
  }, [query, catSel, page]);

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
          <Link to="/" className="pub-nav-brand">📚 Biblioteca</Link>
          <div className="pub-nav-links">
            <Link to="/"            className="pub-nav-link">Inicio</Link>
            <Link to="/catalogo"    className="pub-nav-link active">Catálogo</Link>
            <Link to="/lector-login" className="pub-nav-link pub-nav-login">Mi biblioteca</Link>
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
            <span className="pub-search-icon">🔍</span>
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

        {/* Grid de libros */}
        {loading ? (
          <div className="pub-loading">
            <span className="pub-spinner">📚</span>
            <p>Cargando libros…</p>
          </div>
        ) : libros.length === 0 ? (
          <div className="pub-empty">
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <p>No se encontraron libros con esos criterios.</p>
            <button className="pub-btn-primary" onClick={() => { setQuery(''); setCatSel(''); setPage(1); }}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="pub-books-grid pub-books-grid-lg">
            {libros.map(libro => (
              <Link to={`/libro/${libro.id_libro}`} key={libro.id_libro} className="pub-book-card">
                <div className="pub-book-cover" style={{ background: colorFromTitle(libro.titulo) }}>
                  <span className="pub-book-emoji">📖</span>
                </div>
                <div className="pub-book-info">
                  <h3 className="pub-book-title">{libro.titulo}</h3>
                  <p className="pub-book-author">{libro.autores || 'Autor desconocido'}</p>
                  {libro.editorial && <p className="pub-book-editorial">{libro.editorial}</p>}
                  <div className="pub-book-meta">
                    {libro.anio_publicacion && <span>📅 {libro.anio_publicacion}</span>}
                    <span className={`pub-badge ${libro.disponibles > 0 ? 'pub-badge-green' : 'pub-badge-red'}`}>
                      {libro.disponibles > 0 ? `✅ ${libro.disponibles} disp.` : '❌ No disponible'}
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
          <span>📚 Biblioteca Municipal</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

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
