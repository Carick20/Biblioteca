import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MiBibliotecaPage() {
  const { lectorData, logoutLector } = useAuth();
  const navigate = useNavigate();

  const [tab,       setTab]       = useState('prestamos');
  const [prestamos, setPrestamos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [multas,    setMultas]    = useState([]);
  const [perfil,    setPerfil]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [errors,    setErrors]    = useState({});

  // Dark mode — respeta el estado global del sitio
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('dark_mode') === 'true'
  );
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else          document.body.classList.remove('dark-mode');
    localStorage.setItem('dark_mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/mi-biblioteca/prestamos'),
      api.get('/mi-biblioteca/historial'),
      api.get('/mi-biblioteca/multas'),
      api.get('/mi-biblioteca/perfil'),
    ]).then(([p, h, m, pf]) => {
      const errs = {};
      if (p.status  === 'fulfilled') setPrestamos(p.value.data); else errs.prestamos = true;
      if (h.status  === 'fulfilled') setHistorial(h.value.data); else errs.historial  = true;
      if (m.status  === 'fulfilled') setMultas(m.value.data);    else errs.multas     = true;
      if (pf.status === 'fulfilled') setPerfil(pf.value.data);   else errs.perfil     = true;
      setErrors(errs);
    }).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logoutLector(); navigate('/', { replace: true }); };

  const multasPendientes = multas.filter(m => m.estado === 'PENDIENTE');
  const totalMulta = multasPendientes.reduce((s, m) => s + parseFloat(m.monto || 0), 0);

  return (
    <div className="pub-page">

      {/* Navbar lector */}
      <nav className="pub-nav" style={{ background: 'var(--primary)' }}>
        <div className="pub-container pub-nav-inner">
          <Link to="/" style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
            📚 Mi Biblioteca
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,.85)', fontSize: '.9rem', fontWeight: 500 }}>
              {lectorData?.nombre}
            </span>
            <button
              className="btn-theme-toggle"
              onClick={() => setDarkMode(d => !d)}
              title="Cambiar tema"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn-logout" onClick={handleLogout}>Salir</button>
          </div>
        </div>
      </nav>

      {/* Contenido principal — flex:1 empuja el footer al fondo */}
      <div className="pub-container" style={{ paddingTop: 32, paddingBottom: 64, flex: 1 }}>

        {/* Bienvenida */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: 4 }}>
            Hola, {lectorData?.nombre?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            Código: <strong>{lectorData?.codigo_lector}</strong>
            {' · '}Tipo: <strong>{lectorData?.tipo_lector}</strong>
          </p>
        </div>

        {/* Resumen rápido */}
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          {[
            { val: loading ? '…' : prestamos.length,              lbl: 'Préstamos activos' },
            { val: loading ? '…' : historial.length,              lbl: 'Total historial'   },
            { val: loading ? '…' : multasPendientes.length,       lbl: 'Multas pendientes' },
            { val: loading ? '…' : `S/ ${totalMulta.toFixed(2)}`, lbl: 'Monto a pagar'    },
          ].map(c => (
            <div key={c.lbl} className="stat-card">
              <div className="stat-value">{c.val}</div>
              <div className="stat-label">{c.lbl}</div>
            </div>
          ))}
        </div>

        {/* Error parcial */}
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            No se pudieron cargar algunas secciones ({Object.keys(errors).join(', ')}).
            Intenta recargar la página.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            ['prestamos', 'Préstamos activos'],
            ['historial', 'Historial'],
            ['multas',    'Multas'],
            ['perfil',    'Mi perfil'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}`}
            >
              {l}
              {k === 'multas' && multasPendientes.length > 0 && (
                <span style={{
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '.7rem', fontWeight: 700, marginLeft: 6,
                }}>
                  {multasPendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="pub-loading">
            <div style={{
              width: 48, height: 48,
              border: '4px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spinApple 1s linear infinite',
              margin: '0 auto',
            }} />
            <p>Cargando tus datos…</p>
          </div>
        ) : (
          <>
            {/* ── Préstamos activos ── */}
            {tab === 'prestamos' && (
              prestamos.length === 0 ? (
                <div className="pub-empty">
                  <p>No tienes préstamos activos.</p>
                  <Link to="/catalogo" className="pub-btn-primary">Ver catálogo →</Link>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Libro</th><th>Ejemplar</th><th>Fecha préstamo</th><th>Vence</th><th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prestamos.map(p => (
                        <tr key={p.id_detalle}>
                          <td><strong>{p.titulo}</strong></td>
                          <td><code>{p.codigo_barras}</code></td>
                          <td>{new Date(p.fecha_prestamo).toLocaleDateString('es-PE')}</td>
                          <td className={p.dias_vencido > 0 ? 'text-danger' : ''}>
                            {p.fecha_devolucion_programada}
                            {p.dias_vencido > 0 && (
                              <><br /><small>Vencido hace {p.dias_vencido} día(s)</small></>
                            )}
                          </td>
                          <td>
                            {p.dias_vencido > 0
                              ? <span className="badge badge-danger">Vencido</span>
                              : <span className="badge badge-success">Activo</span>}
                            {p.renovaciones > 0 && (
                              <span className="badge badge-primary" style={{ marginLeft: 4 }}>
                                {p.renovaciones} renov.
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Historial ── */}
            {tab === 'historial' && (
              historial.length === 0 ? (
                <div className="pub-empty"><p>Sin historial de préstamos aún.</p></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Libro</th><th>Código</th><th>Fecha préstamo</th><th>Devolución</th><th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((h, i) => (
                        <tr key={i}>
                          <td>{h.titulo}</td>
                          <td><code>{h.codigo_barras}</code></td>
                          <td>{new Date(h.fecha_prestamo).toLocaleDateString('es-PE')}</td>
                          <td>
                            {h.fecha_devolucion
                              ? new Date(h.fecha_devolucion).toLocaleDateString('es-PE')
                              : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            <span className={`badge ${
                              h.estado_detalle === 'DEVUELTO' ? 'badge-success'
                              : h.estado_detalle === 'ACTIVO'  ? 'badge-primary'
                              : 'badge-danger'
                            }`}>{h.estado_detalle}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* ── Multas ── */}
            {tab === 'multas' && (
              multas.length === 0 ? (
                <div className="pub-empty"><p>No tienes multas registradas. ¡Excelente! 🎉</p></div>
              ) : (
                <>
                  {multasPendientes.length > 0 && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                      Tienes <strong>{multasPendientes.length}</strong> multa(s) pendiente(s)
                      por un total de <strong>S/ {totalMulta.toFixed(2)}</strong>.
                      Acércate a biblioteca para regularizar.
                    </div>
                  )}
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>Libro</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        {multas.map(m => (
                          <tr key={m.id_multa}>
                            <td>{m.titulo}</td>
                            <td>{m.concepto}</td>
                            <td>S/ {parseFloat(m.monto).toFixed(2)}</td>
                            <td>{new Date(m.fecha_generacion).toLocaleDateString('es-PE')}</td>
                            <td>
                              <span className={`badge ${
                                m.estado === 'PAGADA'    ? 'badge-success'
                                : m.estado === 'PENDIENTE' ? 'badge-danger'
                                : 'badge-primary'
                              }`}>{m.estado}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            )}

            {/* ── Perfil ── */}
            {tab === 'perfil' && (
              perfil ? (
                <div className="card" style={{ maxWidth: 500 }}>
                  <div className="card-header">
                    <h2>Datos del lector</h2>
                  </div>
                  {[
                    ['Nombre',           `${perfil.nombres} ${perfil.apellidos}`],
                    ['Documento',        `${perfil.tipo_documento}: ${perfil.numero_documento}`],
                    ['Código de lector', perfil.codigo_lector],
                    ['Tipo de lector',   perfil.tipo_lector],
                    ['Correo',           perfil.correo || '—'],
                    ['Teléfono',         perfil.telefono || '—'],
                    ['Inscripción',      perfil.fecha_inscripcion],
                    ['Vencimiento',      perfil.fecha_vencimiento || '—'],
                    ['Estado',           perfil.estado],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                      fontSize: '.9rem',
                    }}>
                      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{lbl}</span>
                      <span style={{ fontWeight: 700, textAlign: 'right', color: 'var(--text)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pub-empty"><p>No se pudo cargar el perfil.</p></div>
              )
            )}
          </>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link to="/catalogo" className="pub-btn-primary">
            Explorar catálogo →
          </Link>
        </div>

      </div>{/* fin pub-container */}

      <footer className="pub-footer">
        <div className="pub-container">
          <span>📚 Biblioteca Municipal</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>

    </div>
  );
}
