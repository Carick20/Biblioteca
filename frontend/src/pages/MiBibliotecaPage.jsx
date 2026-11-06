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
  const [error,     setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/mi-biblioteca/prestamos'),
      api.get('/mi-biblioteca/historial'),
      api.get('/mi-biblioteca/multas'),
      api.get('/mi-biblioteca/perfil'),
    ])
      .then(([p, h, m, pf]) => {
        setPrestamos(p.data);
        setHistorial(h.data);
        setMultas(m.data);
        setPerfil(pf.data);
      })
      .catch(() => setError('No se pudieron cargar tus datos. Intenta recargar.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logoutLector();
    navigate('/', { replace: true });
  };

  const multasPendientes = multas.filter(m => m.estado === 'PENDIENTE');
  const totalMulta = multasPendientes.reduce((s, m) => s + parseFloat(m.monto), 0);

  return (
    <div className="pub-page">
      {/* Navbar lector */}
      <nav className="pub-nav" style={{ background: 'var(--primary)' }}>
        <div className="pub-container pub-nav-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="pub-nav-brand" style={{ color: '#fff', fontWeight: 700 }}>
            📚 Mi Biblioteca
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'rgba(255,255,255,.85)', fontSize: '.9rem' }}>
              👤 {lectorData?.nombre}
            </span>
            <button
              className="btn-logout"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="pub-container" style={{ paddingTop: 32, paddingBottom: 64 }}>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { ico: '📖', val: prestamos.length,         lbl: 'Préstamos activos' },
            { ico: '📋', val: historial.length,          lbl: 'Total historial' },
            { ico: '⚠️',  val: multasPendientes.length,  lbl: 'Multas pendientes' },
            { ico: '💰', val: `S/ ${totalMulta.toFixed(2)}`, lbl: 'Monto a pagar' },
          ].map(c => (
            <div key={c.lbl} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 20px', textAlign: 'center',
              boxShadow: 'var(--shadow)'
            }}>
              <div style={{ fontSize: '1.8rem' }}>{c.ico}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{c.val}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{c.lbl}</div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            ['prestamos', '📖 Préstamos activos'],
            ['historial', '📋 Historial'],
            ['multas',    '⚠️ Multas'],
            ['perfil',    '👤 Mi perfil'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="pub-loading">
            <span className="pub-spinner">📚</span>
            <p>Cargando tus datos…</p>
          </div>
        ) : (

          <>
            {/* ── Préstamos activos ── */}
            {tab === 'prestamos' && (
              prestamos.length === 0 ? (
                <div className="pub-empty">
                  <span style={{ fontSize: '3rem' }}>📭</span>
                  <p>No tienes préstamos activos.</p>
                  <Link to="/catalogo" className="pub-btn-primary">Ver catálogo →</Link>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Libro</th>
                        <th>Ejemplar</th>
                        <th>Fecha préstamo</th>
                        <th>Vence</th>
                        <th>Estado</th>
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
                              : <span className="badge badge-success">Activo</span>
                            }
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
                <div className="pub-empty">
                  <span style={{ fontSize: '3rem' }}>📚</span>
                  <p>Sin historial de préstamos aún.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Libro</th>
                        <th>Código barras</th>
                        <th>Fecha préstamo</th>
                        <th>Fecha devolución</th>
                        <th>Estado</th>
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
                <div className="pub-empty">
                  <span style={{ fontSize: '3rem' }}>✅</span>
                  <p>No tienes multas registradas. ¡Excelente!</p>
                </div>
              ) : (
                <>
                  {multasPendientes.length > 0 && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                      Tienes <strong>{multasPendientes.length}</strong> multa(s) pendiente(s) por un
                      total de <strong>S/ {totalMulta.toFixed(2)}</strong>.
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
            {tab === 'perfil' && perfil && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '28px 32px',
                maxWidth: 480,
                boxShadow: 'var(--shadow)',
              }}>
                <h3 style={{ marginBottom: 20, color: 'var(--primary)' }}>👤 Datos del lector</h3>
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
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                    fontSize: '.9rem',
                  }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{lbl}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <Link to="/catalogo" className="pub-btn-primary">
            📖 Explorar catálogo
          </Link>
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
