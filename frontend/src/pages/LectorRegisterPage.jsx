import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LectorRegisterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [codigoGenerado, setCodigoGenerado] = useState('');

  const [form, setForm] = useState({
    nombres:            '',
    apellidos:          '',
    tipo_documento:     'DNI',
    numero_documento:   '',
    correo:             '',
    telefono:           '',
    password:           '',
    confirmar_password: '',
  });

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Respetar el dark mode global del sitio
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

    if (!form.nombres.trim() || !form.apellidos.trim())
      return setError('Nombre y apellidos son obligatorios.');
    if (!form.numero_documento.trim())
      return setError('El número de documento es obligatorio.');
    if (!form.correo.trim())
      return setError('El correo electrónico es obligatorio.');
    if (form.password.length < 6)
      return setError('La contraseña debe tener al menos 6 caracteres.');
    if (form.password !== form.confirmar_password)
      return setError('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      const { data } = await api.post('/auth/lector-register', {
        nombres:            form.nombres.trim(),
        apellidos:          form.apellidos.trim(),
        tipo_documento:     form.tipo_documento,
        numero_documento:   form.numero_documento.trim(),
        correo:             form.correo.trim().toLowerCase(),
        telefono:           form.telefono.trim() || undefined,
        password:           form.password,
        confirmar_password: form.confirmar_password,
      });
      setCodigoGenerado(data.codigo_lector);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la cuenta.');
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

      {/* Contenedor centrado — ancho suficiente para el form */}
      <div
        className="pub-container"
        style={{ paddingTop: 48, paddingBottom: 64 }}
      >
        <div
          className="login-card"
          style={{ maxWidth: 480, margin: '0 auto' }}
        >

          {/* ── Paso 2: éxito ── */}
          {step === 2 ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
              <h2 style={{ marginBottom: 8 }}>¡Cuenta creada!</h2>
              <p style={{ color: 'var(--muted)', marginBottom: 8 }}>
                Tu código de lector es:
              </p>
              <div style={{
                fontSize: '1.5rem', fontWeight: 700, letterSpacing: 3,
                color: 'var(--primary)',
                background: 'rgba(0,122,255,0.08)',
                border: '2px solid var(--primary)',
                borderRadius: 12, padding: '14px 24px',
                display: 'inline-block', marginBottom: 20,
              }}>
                {codigoGenerado}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '.88rem', marginBottom: 28 }}>
                Guárdalo — lo necesitarás si vas al mostrador de biblioteca.
                Ya puedes iniciar sesión con tu correo y contraseña.
              </p>
              <button
                className="btn btn-primary btn-full"
                onClick={() => navigate('/lector-login')}
              >
                Iniciar sesión
              </button>
            </div>

          ) : (
            /* ── Paso 1: formulario ── */
            <>
              <h1 style={{ textAlign: 'center', marginBottom: 6 }}>📋 Crear cuenta</h1>
              <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: 28, fontSize: '.9rem' }}>
                Regístrate para solicitar préstamos desde el catálogo.
              </p>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* Nombres + Apellidos */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nombres">Nombres</label>
                    <input
                      id="nombres" name="nombres"
                      className="form-control"
                      value={form.nombres}
                      onChange={handleChange}
                      placeholder="María"
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="apellidos">Apellidos</label>
                    <input
                      id="apellidos" name="apellidos"
                      className="form-control"
                      value={form.apellidos}
                      onChange={handleChange}
                      placeholder="López Quispe"
                    />
                  </div>
                </div>

                {/* Tipo doc + Número */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: '0 0 150px' }}>
                    <label htmlFor="tipo_documento">Tipo doc.</label>
                    <select
                      id="tipo_documento" name="tipo_documento"
                      className="form-control"
                      value={form.tipo_documento}
                      onChange={handleChange}
                    >
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné ext.</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="numero_documento">Número de documento</label>
                    <input
                      id="numero_documento" name="numero_documento"
                      className="form-control"
                      value={form.numero_documento}
                      onChange={handleChange}
                      placeholder="73196320"
                    />
                  </div>
                </div>

                {/* Correo */}
                <div className="form-group">
                  <label htmlFor="correo">Correo electrónico</label>
                  <input
                    id="correo" name="correo"
                    type="email"
                    className="form-control"
                    value={form.correo}
                    onChange={handleChange}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                  />
                </div>

                {/* Teléfono */}
                <div className="form-group">
                  <label htmlFor="telefono">
                    Teléfono{' '}
                    <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', fontSize: '.8rem' }}>
                      (opcional)
                    </span>
                  </label>
                  <input
                    id="telefono" name="telefono"
                    className="form-control"
                    value={form.telefono}
                    onChange={handleChange}
                    placeholder="9XXXXXXXX"
                  />
                </div>

                {/* Contraseña + Confirmar */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="password">Contraseña</label>
                    <input
                      id="password" name="password"
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Mín. 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmar_password">Confirmar</label>
                    <input
                      id="confirmar_password" name="confirmar_password"
                      type="password"
                      className="form-control"
                      value={form.confirmar_password}
                      onChange={handleChange}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full mt-2"
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </form>

              <div style={{ marginTop: 20, textAlign: 'center', fontSize: '.9rem' }}>
                <span style={{ color: 'var(--muted)' }}>¿Ya tienes cuenta? </span>
                <Link to="/lector-login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Iniciar sesión
                </Link>
              </div>
            </>
          )}
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
