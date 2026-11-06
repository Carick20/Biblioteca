import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

export default function DetalleLibro() {
  const { id } = useParams();
  const [libro,   setLibro]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/publico/libros/${id}`)
      .then(r => setLibro(r.data))
      .catch(() => setError('No se encontró el libro.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="pub-page">
      {/* Navbar */}
      <nav className="pub-nav">
        <div className="pub-container pub-nav-inner">
          <Link to="/" className="pub-nav-brand">📚 Biblioteca</Link>
          <div className="pub-nav-links">
            <Link to="/"             className="pub-nav-link">Inicio</Link>
            <Link to="/catalogo"     className="pub-nav-link">Catálogo</Link>
            <Link to="/lector-login" className="pub-nav-link pub-nav-login">Mi biblioteca</Link>
          </div>
        </div>
      </nav>

      <div className="pub-container pub-detail-wrap">
        {/* Breadcrumb */}
        <div className="pub-breadcrumb">
          <Link to="/">Inicio</Link> / <Link to="/catalogo">Catálogo</Link> / <span>{libro?.titulo || '…'}</span>
        </div>

        {loading && (
          <div className="pub-loading">
            <span className="pub-spinner">📚</span>
            <p>Cargando libro…</p>
          </div>
        )}

        {error && (
          <div className="pub-empty">
            <span style={{ fontSize: '3rem' }}>😕</span>
            <p>{error}</p>
            <Link to="/catalogo" className="pub-btn-primary">Volver al catálogo</Link>
          </div>
        )}

        {libro && (
          <div className="pub-detail">
            {/* Portada */}
            <div className="pub-detail-cover" style={libro.portada_url ? {} : { background: colorFromTitle(libro.titulo) }}>
              {libro.portada_url
                ? <img
                    src={libro.portada_url}
                    alt={`Portada de ${libro.titulo}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }}
                  />
                : <span className="pub-detail-emoji">📖</span>
              }
            </div>

            {/* Info principal */}
            <div className="pub-detail-info">
              <div className="pub-detail-cats">
                {libro.categorias?.split(',').map(c => (
                  <span key={c} className="pub-cat-tag">{c.trim()}</span>
                ))}
              </div>

              <h1 className="pub-detail-title">{libro.titulo}</h1>
              {libro.subtitulo && <p className="pub-detail-subtitle">{libro.subtitulo}</p>}

              <p className="pub-detail-author">
                ✍️ <strong>{libro.autores || 'Autor desconocido'}</strong>
              </p>

              {/* Disponibilidad */}
              <div className={`pub-detail-avail ${libro.disponibles > 0 ? 'available' : 'unavailable'}`}>
                <span>{libro.disponibles > 0 ? '✅' : '❌'}</span>
                <div>
                  <strong>
                    {libro.disponibles > 0
                      ? `${libro.disponibles} ejemplar${libro.disponibles > 1 ? 'es' : ''} disponible${libro.disponibles > 1 ? 's' : ''}`
                      : 'No hay ejemplares disponibles'}
                  </strong>
                  <p>{libro.total_ejemplares} ejemplar{libro.total_ejemplares !== 1 ? 'es' : ''} en total</p>
                </div>
              </div>

              {/* Datos del libro */}
              <div className="pub-detail-grid">
                {libro.editorial && (
                  <div className="pub-detail-field">
                    <span className="pub-detail-label">Editorial</span>
                    <span>{libro.editorial}</span>
                  </div>
                )}
                {libro.anio_publicacion && (
                  <div className="pub-detail-field">
                    <span className="pub-detail-label">Año</span>
                    <span>{libro.anio_publicacion}</span>
                  </div>
                )}
                {libro.idioma && (
                  <div className="pub-detail-field">
                    <span className="pub-detail-label">Idioma</span>
                    <span>{libro.idioma}</span>
                  </div>
                )}
                {libro.numero_paginas && (
                  <div className="pub-detail-field">
                    <span className="pub-detail-label">Páginas</span>
                    <span>{libro.numero_paginas}</span>
                  </div>
                )}
                {libro.isbn && (
                  <div className="pub-detail-field">
                    <span className="pub-detail-label">ISBN</span>
                    <span>{libro.isbn}</span>
                  </div>
                )}
              </div>

              {/* Descripción */}
              {libro.descripcion && (
                <div className="pub-detail-desc">
                  <h3>Sinopsis</h3>
                  <p>{libro.descripcion}</p>
                </div>
              )}

              {/* Acciones */}
              <div className="pub-detail-actions">
                <Link to="/catalogo" className="pub-btn-ghost">← Volver al catálogo</Link>
                {libro.disponibles > 0 && (
                  <Link to="/lector-login" state={{ from: '/mi-biblioteca' }} className="pub-btn-primary">
                    Solicitar préstamo →
                  </Link>
                )}
              </div>
            </div>
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
