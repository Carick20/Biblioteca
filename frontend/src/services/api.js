/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────
 * Instancia de Axios con interceptores inteligentes:
 *  - Las rutas /mi-biblioteca/** usan el token del LECTOR.
 *  - Cualquier otra ruta protegida usa el token del ADMIN.
 * ─────────────────────────────────────────────────────────────
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar el token correcto según la ruta
api.interceptors.request.use((config) => {
  const url = config.url || '';
  if (url.startsWith('/mi-biblioteca') || url.startsWith('mi-biblioteca')) {
    const token = localStorage.getItem('lector_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } else {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejo de 401: limpiar solo la sesión correspondiente
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      if (url.startsWith('/mi-biblioteca') || url.startsWith('mi-biblioteca')) {
        localStorage.removeItem('lector_token');
        localStorage.removeItem('lector_data');
        // Solo redirige al login de lectores si no estamos ya ahí
        if (!window.location.pathname.startsWith('/lector-login')) {
          window.location.href = '/lector-login';
        }
      } else {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
