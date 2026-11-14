import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LectorLoginPage() {
  const { loginLector } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/mi-biblioteca';

  const [usar_correo, setUsarCorreo] = useState(true);
  const [form,    setForm]    = useState({ correo: '', numero_documento: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Dark mode global
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('dark_mode') === 'true'
  );
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else          document.body.classList.remove('dark-mode');
    localStorage.setItem('dark_mode', darkMode);
  }, [darkMode]);

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const id = usar_correo ? form.correo : form.numero_documento;
    if (!id.trim() || !form.password) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await loginLector({
        correo:           usar_correo  ? form.correo.trim().toLowerCase() : undefined,
        numero_documento: !usar_correo ? form.numero_documento.trim()     : undefined,
        password:         form.password,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
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

      {/* Área centrada verticalmente */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 128px)', // descuenta navbar + footer aprox
        padding: '40px 20px',
      }}>
        <div className="login-card" style={{ width: '100%', maxWidth: 420 }}>

          <h1>👤 Portal del Lector</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
            Accede para ver tus préstamos y solicitar libros.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Selector correo / documento */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Identificarme con</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${usar_correo ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setUsarCorreo(true)}
              >
                Correo
              </button>
              <button
                type="button"
                className={`btn btn-sm ${!usar_correo ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setUsarCorreo(false)}
              >
                Nº documento
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {usar_correo ? (
              <div className="form-group">
                <label htmlFor="correo">Correo electrónico</label>
                <input
                  id="correo" name="correo"
                  type="email"
                  className="form-control"
                  value={form.correo}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="numero_documento">Nº de documento</label>
                <input
                  id="numero_documento" name="numero_documento"
                  className="form-control"
                  value={form.numero_documento}
                  onChange={handleChange}
                  placeholder="Ej: 73196320"
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password" name="password"
                type="password"
                className="form-control"
                value={form.password}
                onChange={handleChange}
                placeholder="Tu contraseña"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Verificando…' : 'Entrar a mi biblioteca'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: '.9rem' }}>
            <span style={{ color: 'var(--muted)' }}>¿Aún no tienes cuenta? </span>
            <Link to="/lector-registro" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Regístrate
            </Link>
          </div>

          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <Link to="/catalogo" style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
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
