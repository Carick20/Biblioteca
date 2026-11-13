import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LectorLoginPage() {
  const { loginLector } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/mi-biblioteca';

  const [form,    setForm]    = useState({ numero_documento: '', codigo_lector: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.numero_documento || !form.codigo_lector) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await loginLector(form.numero_documento, form.codigo_lector);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Documento o código incorrecto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pub-page">
      {/* Navbar pública */}
      <nav className="pub-nav">
        <div className="pub-container pub-nav-inner">
          <Link to="/" className="pub-nav-brand">📚 Biblioteca</Link>
          <div className="pub-nav-links">
            <Link to="/"         className="pub-nav-link">Inicio</Link>
            <Link to="/catalogo" className="pub-nav-link">Catálogo</Link>
          </div>
        </div>
      </nav>

      <div className="pub-container" style={{ paddingTop: 48, paddingBottom: 64, maxWidth: 440 }}>
        <div className="login-card">
          <h1>👤 Portal del Lector</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            Accede con tu número de documento y código de lector para ver
            tus préstamos, historial y multas.
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="numero_documento">Nº de Documento (DNI / otro)</label>
              <input
                id="numero_documento"
                name="numero_documento"
                className="form-control"
                value={form.numero_documento}
                onChange={handleChange}
                placeholder="Ej: 70000001"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="codigo_lector">Código de Lector</label>
              <input
                id="codigo_lector"
                name="codigo_lector"
                className="form-control"
                value={form.codigo_lector}
                onChange={handleChange}
                placeholder="Ej: LEC-0002"
                autoComplete="current-password"
              />
              <small className="text-muted">
                Lo encuentras en tu carnet de biblioteca.
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full mt-2"
              disabled={loading}
            >
              {loading ? 'Verificando…' : 'Acceder a mi biblioteca'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link to="/catalogo" className="pub-nav-link" style={{ fontSize: '.9rem' }}>
              ← Volver al catálogo
            </Link>
          </div>

          <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', textAlign: 'center' }}>
            ¿Eres administrador?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Acceso al panel
            </Link>
          </p>
        </div>
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
