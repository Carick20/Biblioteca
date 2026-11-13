/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Dos sesiones completamente separadas en localStorage:
 *   admin → claves: 'admin_token' / 'admin_user'
 *   lector → claves: 'lector_token' / 'lector_data'
 *
 * Nunca colisionan entre sí.
 * ─────────────────────────────────────────────────────────────
 */
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  // ── Sesión Administrador ───────────────────────────────────
  const [adminUser, setAdminUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return null; }
  });

  const loginAdmin = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    setAdminUser(data.user);
    return data.user;
  }, []);

  const logoutAdmin = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminUser(null);
  }, []);

  // ── Sesión Lector ──────────────────────────────────────────
  const [lectorData, setLectorData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lector_data')); } catch { return null; }
  });

  const loginLector = useCallback(async (numero_documento, codigo_lector) => {
    const { data } = await api.post('/auth/lector-login', { numero_documento, codigo_lector });
    localStorage.setItem('lector_token', data.token);
    localStorage.setItem('lector_data', JSON.stringify(data.lector));
    setLectorData(data.lector);
    return data.lector;
  }, []);

  const logoutLector = useCallback(() => {
    localStorage.removeItem('lector_token');
    localStorage.removeItem('lector_data');
    setLectorData(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      // Admin
      adminUser,
      loginAdmin,
      logoutAdmin,
      isAdmin: !!adminUser,
      // Lector
      lectorData,
      loginLector,
      logoutLector,
      isLector: !!lectorData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
