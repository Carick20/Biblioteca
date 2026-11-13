import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

/* ── Componente barra horizontal simple ──────────────────── */
function BarraCSS({ valor, maximo, color = 'var(--primary)', label }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <div style={{ width: 130, fontSize: '.82rem', color: 'var(--muted)', flexShrink: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
           title={label}>{label}</div>
      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color,
                      borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <div style={{ width: 36, textAlign: 'right', fontWeight: 700, fontSize: '.88rem' }}>{valor}</div>
    </div>
  );
}

/* ── Tarjeta de estadística ──────────────────────────────── */
function StatCard({ label, value, sub, color }) {
  return (
    <div className={`stat-card ${color || ''}`} style={{ padding: '14px 18px' }}>
      <div className="stat-value" style={{ fontSize: '1.6rem' }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function ReportesPage() {
  const [dash,       setDash]       = useState(null);
  const [porMes,     setPorMes]     = useState([]);
  const [multasMes,  setMultasMes]  = useState([]);
  const [vencidos,   setVencidos]   = useState([]);
  const [conMultas,  setConMultas]  = useState([]);
  const [masActivos, setMasActivos] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('general');
  const [error,      setError]      = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: d },
        { data: pm },
        { data: mm },
        { data: v },
        { data: cm },
        { data: ma },
      ] = await Promise.all([
        api.get('/reportes/dashboard'),
        api.get('/reportes/prestamos-por-mes'),
        api.get('/reportes/multas-por-mes'),
        api.get('/reportes/prestamos-vencidos'),
        api.get('/reportes/lectores-con-multas'),
        api.get('/reportes/lectores-mas-activos'),
      ]);
      setDash(d);
      setPorMes(pm);
      setMultasMes(mm);
      setVencidos(v);
      setConMultas(cm);
      setMasActivos(ma);
    } catch {
      setError('Error al cargar reportes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fmt  = v => parseFloat(v || 0).toFixed(2);
  const fmtF = f => f ? new Date(f).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

  if (loading) return <div className="loading">Cargando reportes…</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const { stats, top_libros, inventario, ultimos_prestamos } = dash;
  const maxPorMes   = Math.max(...porMes.map(r => r.total), 1);
  const maxMultaMes = Math.max(...multasMes.map(r => r.total), 1);
  const maxActivos  = Math.max(...masActivos.map(r => r.total_prestamos), 1);

  const TABS = [
    ['general',   '📊 General'],
    ['tendencias','📈 Tendencias'],
    ['vencidos',  '⚠ Vencidos'],
    ['multas',    '💰 Multas'],
    ['lectores',  '👤 Lectores'],
  ];

  return (
    <>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <h2 style={{ color: 'var(--primary)' }}>📈 Reportes</h2>
        <button className="btn btn-outline btn-sm" onClick={fetchAll}>🔄 Actualizar</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => (
          <button key={k}
            className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(k)}>{l}
          </button>
        ))}
      </div>

      {/* ══ GENERAL ══════════════════════════════════════════ */}
      {tab === 'general' && (
        <>
          {/* KPIs */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <StatCard label="Títulos activos"       value={stats.total_libros}       />
            <StatCard label="Ejemplares disponibles" value={stats.disponibles}        color="success"
              sub={`de ${stats.total_ejemplares} en total`} />
            <StatCard label="Préstamos activos"     value={stats.prestamos_activos}  />
            <StatCard label="Préstamos vencidos"    value={stats.prestamos_vencidos}
              color={stats.prestamos_vencidos > 0 ? 'danger' : ''} />
            <StatCard label="Multas pendientes"     value={stats.multas_pendientes}
              color={stats.multas_pendientes > 0 ? 'warning' : ''}
              sub={`S/ ${fmt(stats.monto_multas)} por cobrar`} />
            <StatCard label="Lectores activos"      value={stats.lectores_activos}   />
            <StatCard label="Monto cobrado (multas)" value={`S/ ${fmt(stats.monto_cobrado)}`} color="success" />
            <StatCard label="Préstamos hoy"          value={stats.prestamos_hoy}      />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20 }}>
            {/* Top libros */}
            <div className="card">
              <div className="card-header"><h2>📚 Top 8 libros más prestados</h2></div>
              {top_libros.length ? (
                <div style={{ padding: '8px 4px' }}>
                  {top_libros.map((t, i) => (
                    <BarraCSS
                      key={i}
                      label={`${i+1}. ${t.titulo}`}
                      valor={t.total_prestamos}
                      maximo={top_libros[0]?.total_prestamos || 1}
                      color="var(--primary)"
                    />
                  ))}
                </div>
              ) : <p className="text-muted" style={{ padding: 16 }}>Sin préstamos registrados aún.</p>}
            </div>

            {/* Inventario */}
            <div className="card">
              <div className="card-header"><h2>📦 Inventario por estado</h2></div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>Estado</th><th>Ejemplares</th><th>%</th></tr>
                  </thead>
                  <tbody>
                    {inventario.map((row, i) => {
                      const total = inventario.reduce((s, r) => s + parseInt(r.cantidad, 10), 0);
                      const pct   = total ? Math.round((row.cantidad / total) * 100) : 0;
                      return (
                        <tr key={i}>
                          <td>
                            <span className={`badge ${
                              row.estado === 'DISPONIBLE' ? 'badge-success'
                              : row.estado === 'PRESTADO'  ? 'badge-primary'
                              : row.estado === 'DAÑADO'    ? 'badge-warning'
                              : 'badge-danger'}`}>
                              {row.estado}
                            </span>
                          </td>
                          <td><strong>{row.cantidad}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: `${pct}px`, minWidth: 4, height: 10,
                                            background: 'var(--accent)', borderRadius: 4 }} />
                              {pct}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Últimos préstamos */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header"><h2>🕐 Últimos 10 préstamos registrados</h2></div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>#</th><th>Fecha</th><th>Lector</th><th>Libro(s)</th><th>Cant.</th></tr>
                </thead>
                <tbody>
                  {ultimos_prestamos.map((p, i) => (
                    <tr key={i}>
                      <td><code style={{ fontSize: '.8rem' }}>#{p.id_prestamo}</code></td>
                      <td style={{ fontSize: '.82rem' }}>{p.fecha_prestamo}</td>
                      <td>
                        {p.lector}<br/>
                        <small className="text-muted">{p.codigo_lector}</small>
                      </td>
                      <td style={{ fontSize: '.82rem', maxWidth: 220 }}>{p.libros}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-primary">{p.cantidad_libros}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ TENDENCIAS ═══════════════════════════════════════ */}
      {tab === 'tendencias' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 20 }}>
          {/* Préstamos por mes */}
          <div className="card">
            <div className="card-header"><h2>📅 Préstamos por mes (12 meses)</h2></div>
            {porMes.length ? (
              <div style={{ padding: '12px 8px' }}>
                {porMes.map((r, i) => (
                  <BarraCSS
                    key={i}
                    label={r.mes_label}
                    valor={r.total}
                    maximo={maxPorMes}
                    color="var(--primary)"
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ padding: 16 }}>Sin datos de los últimos 12 meses.</p>
            )}
          </div>

          {/* Multas por mes */}
          <div className="card">
            <div className="card-header"><h2>💰 Multas generadas por mes (12 meses)</h2></div>
            {multasMes.length ? (
              <>
                <div style={{ padding: '12px 8px' }}>
                  {multasMes.map((r, i) => (
                    <BarraCSS
                      key={i}
                      label={r.mes_label}
                      valor={r.total}
                      maximo={maxMultaMes}
                      color="var(--danger)"
                    />
                  ))}
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Mes</th><th>Total</th><th>Pendientes</th><th>Pagadas</th><th>Monto (S/)</th></tr>
                    </thead>
                    <tbody>
                      {multasMes.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: '.85rem' }}>{r.mes_label}</td>
                          <td>{r.total}</td>
                          <td><span className="badge badge-warning">{r.pendientes}</span></td>
                          <td><span className="badge badge-success">{r.pagadas}</span></td>
                          <td><strong>S/ {fmt(r.monto_total)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-muted" style={{ padding: 16 }}>Sin multas en los últimos 12 meses.</p>
            )}
          </div>
        </div>
      )}

      {/* ══ VENCIDOS ═════════════════════════════════════════ */}
      {tab === 'vencidos' && (
        <div className="card">
          <div className="card-header">
            <h2>⚠ Préstamos vencidos activos</h2>
            <span className="badge badge-danger">{vencidos.length} préstamos</span>
          </div>
          {vencidos.length === 0 ? (
            <div className="empty-state"><p>✅ No hay préstamos vencidos. ¡Todo al día!</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Código barras</th>
                    <th>Lector</th>
                    <th>Contacto</th>
                    <th>Tipo lector</th>
                    <th>Fecha devolución</th>
                    <th>Días vencido</th>
                    <th>Multa estimada</th>
                    <th>Renovaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vencidos.map((v, i) => (
                    <tr key={i} style={{ background: v.dias_vencido > 14 ? 'rgba(231,76,60,.07)' : '' }}>
                      <td><strong style={{ fontSize: '.9rem' }}>{v.titulo}</strong></td>
                      <td><code style={{ fontSize: '.8rem' }}>{v.codigo_barras}</code></td>
                      <td>
                        {v.lector}<br/>
                        <small className="text-muted">{v.codigo_lector}</small>
                      </td>
                      <td style={{ fontSize: '.82rem' }}>
                        {v.correo && <div>📧 {v.correo}</div>}
                        {v.telefono && <div>📞 {v.telefono}</div>}
                        {!v.correo && !v.telefono && <span className="text-muted">—</span>}
                      </td>
                      <td style={{ fontSize: '.82rem' }}>{v.tipo_lector}</td>
                      <td>
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                          {fmtF(v.fecha_devolucion_programada)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-danger">{v.dias_vencido}d</span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--danger)' }}>
                          S/ {fmt(v.multa_estimada)}
                        </strong>
                        <br/>
                        <small className="text-muted" style={{ fontSize: '.75rem' }}>
                          ({v.multa_por_dia}/día)
                        </small>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {v.renovaciones > 0
                          ? <span className="badge badge-primary">{v.renovaciones}</span>
                          : <span className="text-muted">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totales vencidos */}
          {vencidos.length > 0 && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)',
                          display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '.85rem' }}>Total multas estimadas: </span>
                <strong style={{ color: 'var(--danger)' }}>
                  S/ {fmt(vencidos.reduce((s, v) => s + parseFloat(v.multa_estimada || 0), 0))}
                </strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '.85rem' }}>Promedio días vencido: </span>
                <strong>{Math.round(vencidos.reduce((s, v) => s + v.dias_vencido, 0) / vencidos.length)}d</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '.85rem' }}>Máx. días vencido: </span>
                <strong style={{ color: 'var(--danger)' }}>{Math.max(...vencidos.map(v => v.dias_vencido))}d</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MULTAS ═══════════════════════════════════════════ */}
      {tab === 'multas' && (
        <div className="card">
          <div className="card-header">
            <h2>💰 Lectores con multas pendientes</h2>
            <span className="badge badge-warning">{conMultas.length} lectores</span>
          </div>
          {conMultas.length === 0 ? (
            <div className="empty-state"><p>✅ No hay lectores con multas pendientes.</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Lector</th>
                    <th>Código</th>
                    <th>Tipo lector</th>
                    <th>Contacto</th>
                    <th>Nº multas</th>
                    <th>Monto total (S/)</th>
                    <th>Última multa</th>
                  </tr>
                </thead>
                <tbody>
                  {conMultas.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.nombre}</strong></td>
                      <td><code style={{ fontSize: '.82rem' }}>{c.codigo_lector}</code></td>
                      <td style={{ fontSize: '.82rem' }}>{c.tipo_lector}</td>
                      <td style={{ fontSize: '.82rem' }}>
                        {c.correo && <div>📧 {c.correo}</div>}
                        {c.telefono && <div>📞 {c.telefono}</div>}
                        {!c.correo && !c.telefono && <span className="text-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-warning">{c.total_multas}</span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--danger)', fontSize: '1.05rem' }}>
                          S/ {fmt(c.monto_total)}
                        </strong>
                      </td>
                      <td style={{ fontSize: '.82rem' }}>{fmtF(c.ultima_multa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conMultas.length > 0 && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--danger)' }}>
                Total por cobrar: S/ {fmt(conMultas.reduce((s, c) => s + parseFloat(c.monto_total || 0), 0))}
              </strong>
            </div>
          )}
        </div>
      )}

      {/* ══ LECTORES ═════════════════════════════════════════ */}
      {tab === 'lectores' && (
        <div className="card">
          <div className="card-header"><h2>👤 Top lectores más activos</h2></div>
          {masActivos.length === 0 ? (
            <div className="empty-state"><p>Sin datos de préstamos aún.</p></div>
          ) : (
            <>
              <div style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                {masActivos.map((r, i) => (
                  <BarraCSS
                    key={i}
                    label={`${i+1}. ${r.nombre}`}
                    valor={r.total_prestamos}
                    maximo={maxActivos}
                    color={i === 0 ? 'var(--primary)' : i === 1 ? 'var(--accent)' : 'var(--success)'}
                  />
                ))}
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Lector</th>
                      <th>Código</th>
                      <th>Tipo</th>
                      <th>Total préstamos</th>
                      <th>Activos ahora</th>
                      <th>Último préstamo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masActivos.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</td>
                        <td><strong>{r.nombre}</strong></td>
                        <td><code style={{ fontSize: '.82rem' }}>{r.codigo_lector}</code></td>
                        <td style={{ fontSize: '.82rem' }}>{r.tipo_lector}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-primary">{r.total_prestamos}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.prestamos_activos > 0
                            ? <span className="badge badge-success">{r.prestamos_activos}</span>
                            : <span className="text-muted">0</span>}
                        </td>
                        <td style={{ fontSize: '.82rem' }}>
                          {r.ultimo_prestamo
                            ? new Date(r.ultimo_prestamo).toLocaleDateString('es-PE')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
