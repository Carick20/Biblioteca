/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────
 * Instancia de Axios con interceptores:
 *  - Las rutas /mi-biblioteca/** usan el token del LECTOR.
 *  - Cualquier otra ruta protegida usa el token del ADMIN.
 *
 * El interceptor de respuesta SOLO redirige al login cuando
 * el 401 viene de una ruta protegida, nunca de las rutas de
 * autenticación en sí (/auth/*).
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

// Manejo de 401: solo redirige si NO estamos en una ruta de auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      // No redirigir si el 401 vino del propio login/registro
      const esRutaAuth = url.startsWith('/auth') || url.startsWith('auth');
      if (!esRutaAuth) {
        if (url.startsWith('/mi-biblioteca') || url.startsWith('mi-biblioteca')) {
          localStorage.removeItem('lector_token');
          localStorage.removeItem('lector_data');
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
    }
    return Promise.reject(err);
  }
);

export default api;
