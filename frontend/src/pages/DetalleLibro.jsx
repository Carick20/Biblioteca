import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function DetalleLibro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLector, lectorData, logoutLector } = useAuth();

  const [libro,          setLibro]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [solicitando,    setSolicitando]    = useState(false);
  const [prestamoMsg,    setPrestamoMsg]    = useState('');
  const [prestamoError,  setPrestamoError]  = useState('');

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/publico/libros/${id}`)
      .then(r => setLibro(r.data))
      .catch(() => setError('No se encontró el libro.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSolicitarPrestamo = async () => {
    if (!isLector) {
      // Guardar destino para volver aquí tras el login
      navigate('/lector-login', { state: { from: `/libro/${id}` } });
      return;
    }
    setSolicitando(true);
    setPrestamoMsg('');
    setPrestamoError('');
    try {
      const { data } = await api.post('/mi-biblioteca/solicitar-prestamo', { id_libro: parseInt(id, 10) });
      setPrestamoMsg(data.message);
      // Actualizar disponibilidad localmente
      setLibro(prev => prev ? { ...prev, disponibles: prev.disponibles - 1 } : prev);
    } catch (err) {
      setPrestamoError(err.response?.data?.message || 'Error al solicitar el préstamo.');
    } finally {
      setSolicitando(false);
    }
  };

  return (
    <div className="pub-page">
      {/* Navbar */}
      <nav className="pub-nav">
        <div className="pub-container pub-nav-inner">
          <Link to="/" className="pub-nav-brand">📚 Biblioteca</Link>
          <div className="pub-nav-links">
            <Link to="/"         className="pub-nav-link">Inicio</Link>
            <Link to="/catalogo" className="pub-nav-link">Catálogo</Link>
            {isLector ? (
              <>
                <Link to="/mi-biblioteca" className="pub-nav-link" style={{ fontWeight: 600 }}>
                  👤 {lectorData?.nombre?.split(' ')[0]}
                </Link>
                <button
                  className="pub-nav-link pub-nav-login"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => { logoutLector(); }}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link to="/lector-login" className="pub-nav-link pub-nav-login">Mi biblioteca</Link>
            )}
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
            <div style={{ width: '48px', height: '48px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spinApple 1s linear infinite', margin: '0 auto' }}></div>
            <p>Cargando libro…</p>
          </div>
        )}

        {error && (
          <div className="pub-empty">
            <p>{error}</p>
            <Link to="/catalogo" className="pub-btn-primary">Volver al catálogo</Link>
          </div>
        )}

        {libro && (
          <div className="pub-detail">
            {/* Portada */}
            <div className="pub-detail-cover">
              <img
                src={libro.portada_url || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop"}
                alt={`Portada de ${libro.titulo}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }}
              />
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
                Autor: <strong>{libro.autores || 'Autor desconocido'}</strong>
              </p>

              {/* Disponibilidad */}
              <div className={`pub-detail-avail ${libro.disponibles > 0 ? 'available' : 'unavailable'}`}>
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

              {/* Mensajes de solicitud */}
              {prestamoMsg && (
                <div className="alert alert-success" style={{ marginTop: 12 }}>
                  ✅ {prestamoMsg}{' '}
                  <Link to="/mi-biblioteca" style={{ fontWeight: 600 }}>Ver mis préstamos →</Link>
                </div>
              )}
              {prestamoError && (
                <div className="alert alert-error" style={{ marginTop: 12 }}>
                  {prestamoError}
                </div>
              )}

              {/* Acciones */}
              <div className="pub-detail-actions">
                <Link to="/catalogo" className="pub-btn-ghost">← Volver al catálogo</Link>

                {libro.disponibles > 0 && !prestamoMsg && (
                  <button
                    className="pub-btn-primary"
                    onClick={handleSolicitarPrestamo}
                    disabled={solicitando}
                  >
                    {solicitando
                      ? 'Procesando…'
                      : isLector
                        ? '📖 Solicitar préstamo'
                        : '🔑 Iniciar sesión para pedir prestado'}
                  </button>
                )}
              </div>
            </div>
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
