import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) {
      setError('Completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      await loginAdmin(form.username, form.password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>📚 Biblioteca</h1>
        <p>Panel de Administración</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              className="form-control"
              value={form.username}
              onChange={handleChange}
              autoFocus
              autoComplete="username"
              placeholder="admin"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar al panel'}
          </button>
        </form>

        <p className="text-muted text-center mt-2" style={{ fontSize: '.8rem' }}>
          Usuario: <strong>admin</strong> / Contraseña: <strong>admin123</strong>
        </p>

        <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
        <p style={{ fontSize: '.8rem', color: 'var(--muted)', textAlign: 'center' }}>
          ¿Eres lector?{' '}
          <Link to="/lector-login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Acceso al portal de lectores
          </Link>
        </p>
      </div>
    </div>
  );
}
