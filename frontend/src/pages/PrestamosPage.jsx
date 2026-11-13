import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function PrestamosPage() {
  const [prestamos,   setPrestamos]   = useState([]);
  const [historial,   setHistorial]   = useState([]);
  const [lectores,    setLectores]    = useState([]);
  const [disponibles, setDisponibles] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('activos');
  const [modal,       setModal]       = useState(false);
  const [modalDev,    setModalDev]    = useState(null); // objeto detalle
  const [form,        setForm]        = useState({ id_lector: '', id_ejemplares: [] });
  const [estadoEj,    setEstadoEj]    = useState('DISPONIBLE');
  const [obsDevol,    setObsDevol]    = useState('');
  const [msg,         setMsg]         = useState({ text: '', type: '' });
  const [saving,      setSaving]      = useState(false);

  // Filtros tabla activos
  const [busqActivos, setBusqActivos] = useState('');
  const [filtroVenc,  setFiltroVenc]  = useState('TODOS'); // TODOS | VENCIDOS | OK

  // Filtros historial
  const [busqHist,  setBusqHist]  = useState('');
  const [filtroEst, setFiltroEst] = useState('TODOS');
  const [pageHist,  setPageHist]  = useState(1);
  const HIST_LIMIT = 50;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: l }, { data: d }] = await Promise.all([
        api.get('/prestamos'),
        api.get('/lectores'),
        api.get('/catalogo/ejemplares-disponibles'),
      ]);
      setPrestamos(p);
      setLectores(l.filter(x => x.estado === 'ACTIVO'));
      setDisponibles(d);
    } catch {
      setMsg({ text: 'Error al cargar datos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistorial = useCallback(async (page = 1, estado = 'TODOS', q = '') => {
    try {
      const params = new URLSearchParams({
        page, limit: HIST_LIMIT,
        ...(estado !== 'TODOS' ? { estado } : {}),
      });
      const { data } = await api.get(`/reportes/historial-completo?${params}`);
      setHistorial(data);
    } catch {
      setMsg({ text: 'Error al cargar historial.', type: 'error' });
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (tab === 'historial') fetchHistorial(pageHist, filtroEst);
  }, [tab, pageHist, filtroEst, fetchHistorial]);

  const openNuevo = () => {
    setForm({ id_lector: lectores[0]?.id_lector || '', id_ejemplares: [] });
    setMsg({ text: '', type: '' });
    setModal(true);
  };

  const toggleEjemplar = (id) => {
    setForm(f => ({
      ...f,
      id_ejemplares: f.id_ejemplares.includes(id)
        ? f.id_ejemplares.filter(x => x !== id)
        : [...f.id_ejemplares, id],
    }));
  };

  const handlePrestar = async e => {
    e.preventDefault();
    if (!form.id_lector || form.id_ejemplares.length === 0) {
      setMsg({ text: 'Selecciona un lector y al menos un ejemplar.', type: 'error' }); return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/prestamos', {
        id_lector:    parseInt(form.id_lector, 10),
        id_ejemplares: form.id_ejemplares.map(Number),
      });
      setMsg({ text: data.message, type: 'success' });
      await fetchAll();
      setTimeout(() => setModal(false), 1400);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al registrar préstamo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDevolver = async () => {
    if (!modalDev) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/prestamos/devolver/${modalDev.id_detalle}`, {
        estado_ejemplar: estadoEj,
        observaciones:   obsDevol || undefined,
      });
      setMsg({ text: data.message, type: 'success' });
      setModalDev(null);
      setObsDevol('');
      await fetchAll();
      if (tab === 'historial') fetchHistorial(pageHist, filtroEst);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al devolver.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 5000);
    }
  };

  const handleRenovar = async (id_detalle) => {
    if (!confirm('¿Renovar este préstamo?')) return;
    try {
      const { data } = await api.post(`/prestamos/renovar/${id_detalle}`);
      setMsg({ text: data.message, type: 'success' });
      fetchAll();
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'No se pudo renovar.', type: 'error' });
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    }
  };

  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) : '—';

  // Filtros en memoria para activos
  const activosFiltrados = prestamos.filter(p => {
    const q = busqActivos.toLowerCase();
    const matchQ = !q || p.titulo?.toLowerCase().includes(q)
                       || p.lector?.toLowerCase().includes(q)
                       || p.codigo_lector?.toLowerCase().includes(q)
                       || p.codigo_barras?.toLowerCase().includes(q);
    const matchV = filtroVenc === 'TODOS'
      || (filtroVenc === 'VENCIDOS' && p.dias_vencido > 0)
      || (filtroVenc === 'OK'       && p.dias_vencido <= 0);
    return matchQ && matchV;
  });

  const histFiltrado = (historial.data || []).filter(h => {
    const q = busqHist.toLowerCase();
    return !q || h.titulo?.toLowerCase().includes(q)
              || h.lector?.toLowerCase().includes(q)
              || h.codigo_lector?.toLowerCase().includes(q);
  });

  const vencidosCount = prestamos.filter(p => p.dias_vencido > 0).length;

  return (
    <>
      <div className="card-header">
        <h2 style={{ color: 'var(--primary)' }}>🔄 Préstamos</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {vencidosCount > 0 && (
            <span className="badge badge-danger">
              ⚠ {vencidosCount} vencido{vencidosCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="badge badge-primary">{prestamos.length} activos</span>
          <button className="btn btn-primary btn-sm" onClick={openNuevo}>+ Nuevo préstamo</button>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}
             style={{ marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['activos','📋 Activos'],['historial','📜 Historial completo']].map(([k,l]) => (
          <button key={k}
            className={`btn ${tab === k ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setTab(k)}>{l}
          </button>
        ))}
      </div>

      {/* ══ TAB: ACTIVOS ══════════════════════════════════════ */}
      {tab === 'activos' && (
        <>
          {/* Filtros activos */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {[['TODOS','Todos'],['VENCIDOS','Vencidos'],['OK','Al día']].map(([k,l]) => (
              <button key={k}
                className={`btn btn-sm ${filtroVenc === k ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFiltroVenc(k)}>{l}
              </button>
            ))}
            <input
              className="form-control"
              style={{ maxWidth: 280, marginLeft: 'auto' }}
              placeholder="Buscar libro, lector, código…"
              value={busqActivos}
              onChange={e => setBusqActivos(e.target.value)}
            />
            {busqActivos && (
              <button className="btn btn-sm btn-outline" onClick={() => setBusqActivos('')}>✕</button>
            )}
          </div>

          {loading ? (
            <div className="loading">Cargando préstamos…</div>
          ) : activosFiltrados.length === 0 ? (
            <div className="empty-state">
              <p>{prestamos.length === 0 ? 'No hay préstamos activos.' : 'No hay resultados con ese filtro.'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Código barras</th>
                    <th>Lector</th>
                    <th>Fecha préstamo</th>
                    <th>Fecha devolución</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activosFiltrados.map(p => (
                    <tr key={p.id_detalle}
                        style={{ background: p.dias_vencido > 0 ? 'rgba(231,76,60,.05)' : '' }}>
                      <td><strong>{p.titulo}</strong></td>
                      <td><code style={{ fontSize: '.82rem' }}>{p.codigo_barras}</code></td>
                      <td>
                        {p.lector}<br/>
                        <small className="text-muted">{p.codigo_lector}</small>
                      </td>
                      <td style={{ fontSize: '.85rem' }}>
                        {new Date(p.fecha_prestamo).toLocaleDateString('es-PE')}
                      </td>
                      <td>
                        <span style={{ color: p.dias_vencido > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {fmtFecha(p.fecha_devolucion_programada)}
                        </span>
                        {p.dias_vencido > 0 && (
                          <><br/>
                          <small className="text-danger">
                            Vencido hace {p.dias_vencido} día{p.dias_vencido > 1 ? 's' : ''}
                          </small></>
                        )}
                      </td>
                      <td>
                        {p.renovaciones > 0 && (
                          <span className="badge badge-primary" style={{ marginRight: 4 }}>
                            {p.renovaciones} renov.
                          </span>
                        )}
                        {p.dias_vencido > 0 && (
                          <span className="badge badge-danger">VENCIDO</span>
                        )}
                        {p.dias_vencido <= 0 && (
                          <span className="badge badge-success">Al día</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-success btn-sm"
                          style={{ marginRight: 5 }}
                          onClick={() => {
                            setEstadoEj('DISPONIBLE');
                            setObsDevol('');
                            setModalDev(p);
                          }}
                        >↩ Devolver</button>
                        {p.dias_vencido <= 0 && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleRenovar(p.id_detalle)}
                          >🔁 Renovar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ══ TAB: HISTORIAL ════════════════════════════════════ */}
      {tab === 'historial' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {[['TODOS','Todos'],['ACTIVO','Activo'],['DEVUELTO','Devuelto'],['DAÑADO','Dañado'],['PERDIDO','Perdido']].map(([k,l]) => (
              <button key={k}
                className={`btn btn-sm ${filtroEst === k ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setFiltroEst(k); setPageHist(1); }}>{l}
              </button>
            ))}
            <input
              className="form-control"
              style={{ maxWidth: 260, marginLeft: 'auto' }}
              placeholder="Buscar libro, lector…"
              value={busqHist}
              onChange={e => setBusqHist(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Libro</th>
                  <th>Código</th>
                  <th>Lector</th>
                  <th>Tipo lector</th>
                  <th>Fecha préstamo</th>
                  <th>Fecha devolución prog.</th>
                  <th>Fecha devolución real</th>
                  <th>Días diferencia</th>
                  <th>Renovaciones</th>
                  <th>Multas (S/)</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {histFiltrado.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    No hay registros.
                  </td></tr>
                ) : histFiltrado.map((h, i) => (
                  <tr key={i}>
                    <td><strong style={{ fontSize: '.9rem' }}>{h.titulo}</strong></td>
                    <td><code style={{ fontSize: '.8rem' }}>{h.codigo_barras}</code></td>
                    <td>
                      {h.lector}<br/>
                      <small className="text-muted">{h.codigo_lector}</small>
                    </td>
                    <td style={{ fontSize: '.82rem' }}>{h.tipo_lector}</td>
                    <td style={{ fontSize: '.82rem' }}>{h.fecha_prestamo}</td>
                    <td style={{ fontSize: '.82rem' }}>{fmtFecha(h.fecha_devolucion_programada)}</td>
                    <td style={{ fontSize: '.82rem' }}>
                      {h.fecha_devolucion
                        ? new Date(h.fecha_devolucion).toLocaleDateString('es-PE')
                        : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ fontSize: '.82rem', textAlign: 'center' }}>
                      {h.fecha_devolucion ? (
                        <span style={{ color: h.dias_diferencia > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {h.dias_diferencia > 0 ? `+${h.dias_diferencia}d` : h.dias_diferencia < 0 ? `${h.dias_diferencia}d` : '0d'}
                        </span>
                      ) : (
                        h.estado_detalle === 'ACTIVO'
                          ? <span className="text-muted">En préstamo</span>
                          : <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {h.renovaciones > 0
                        ? <span className="badge badge-primary">{h.renovaciones}</span>
                        : <span className="text-muted">0</span>}
                    </td>
                    <td style={{ fontSize: '.85rem' }}>
                      {h.multas_prestamo
                        ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>S/ {parseFloat(h.multas_prestamo).toFixed(2)}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${
                        h.estado_detalle === 'ACTIVO'    ? 'badge-primary'
                        : h.estado_detalle === 'DEVUELTO' ? 'badge-success'
                        : 'badge-danger'}`}>
                        {h.estado_detalle}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {historial.total > HIST_LIMIT && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline btn-sm"
                disabled={pageHist === 1}
                onClick={() => setPageHist(p => p - 1)}>← Anterior</button>
              <span style={{ padding: '4px 12px', color: 'var(--muted)', fontSize: '.9rem' }}>
                Pág. {pageHist} de {Math.ceil(historial.total / HIST_LIMIT)}
              </span>
              <button className="btn btn-outline btn-sm"
                disabled={pageHist >= Math.ceil(historial.total / HIST_LIMIT)}
                onClick={() => setPageHist(p => p + 1)}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {/* ══ MODAL: NUEVO PRÉSTAMO ════════════════════════════ */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar nuevo préstamo">
        {msg.text && (
          <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>
        )}
        <form onSubmit={handlePrestar}>
          <div className="form-group">
            <label>Lector *</label>
            <select
              name="id_lector"
              className="form-control"
              value={form.id_lector}
              onChange={e => setForm(f => ({ ...f, id_lector: e.target.value }))}
            >
              <option value="">— Seleccionar lector —</option>
              {lectores.map(l => (
                <option key={l.id_lector} value={l.id_lector}>
                  {l.nombre_completo} ({l.codigo_lector}) — {l.tipo_lector}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              Ejemplares disponibles *{' '}
              <small className="text-muted">({disponibles.length} disponibles)</small>
            </label>
            <div style={{
              maxHeight: 240, overflowY: 'auto',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '8px',
            }}>
              {disponibles.length === 0 ? (
                <p className="text-muted" style={{ padding: 8 }}>No hay ejemplares disponibles.</p>
              ) : disponibles.map(d => (
                <label key={d.id_ejemplar} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '6px 4px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <input
                    type="checkbox"
                    checked={form.id_ejemplares.includes(d.id_ejemplar)}
                    onChange={() => toggleEjemplar(d.id_ejemplar)}
                  />
                  <div>
                    <strong style={{ fontSize: '.9rem' }}>{d.titulo}</strong><br/>
                    <small className="text-muted">
                      Código: <code>{d.codigo_barras}</code>
                      {d.ubicacion && ` · Ubicación: ${d.ubicacion}`}
                    </small>
                  </div>
                </label>
              ))}
            </div>
            {form.id_ejemplares.length > 0 && (
              <small className="text-muted" style={{ marginTop: 4, display: 'block' }}>
                ✅ {form.id_ejemplares.length} ejemplar(es) seleccionado(s)
              </small>
            )}
          </div>

          <div className="flex-end mt-2">
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Registrando…' : 'Registrar préstamo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL: DEVOLUCIÓN ════════════════════════════════ */}
      <Modal
        open={!!modalDev}
        onClose={() => { setModalDev(null); setObsDevol(''); }}
        title="Registrar devolución"
      >
        {modalDev && (
          <div style={{
            background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
            marginBottom: 16, fontSize: '.88rem', border: '1px solid var(--border)',
          }}>
            <strong>{modalDev.titulo}</strong><br/>
            <span className="text-muted">
              Código: <code>{modalDev.codigo_barras}</code> ·
              Lector: {modalDev.lector} ·
              Vencía: <span style={{ color: modalDev.dias_vencido > 0 ? 'var(--danger)' : 'inherit', fontWeight: 600 }}>
                {fmtFecha(modalDev.fecha_devolucion_programada)}
              </span>
            </span>
            {modalDev.dias_vencido > 0 && (
              <div style={{ marginTop: 6, color: 'var(--danger)', fontWeight: 600 }}>
                ⚠ Vencido hace {modalDev.dias_vencido} día(s) —
                se generará multa automáticamente.
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Estado del ejemplar devuelto *</label>
          <select className="form-control" value={estadoEj} onChange={e => setEstadoEj(e.target.value)}>
            <option value="DISPONIBLE">✅ Buen estado (disponible)</option>
            <option value="DAÑADO">⚠ Dañado</option>
            <option value="PERDIDO">❌ Perdido</option>
          </select>
        </div>

        {estadoEj !== 'DISPONIBLE' && (
          <div className="form-group">
            <label>Observaciones <small className="text-muted">(recomendado si está dañado/perdido)</small></label>
            <textarea
              className="form-control"
              rows={2}
              value={obsDevol}
              onChange={e => setObsDevol(e.target.value)}
              placeholder="Describe el estado del ejemplar…"
            />
          </div>
        )}

        <div className="flex-end mt-2">
          <button className="btn btn-outline" onClick={() => { setModalDev(null); setObsDevol(''); }}>
            Cancelar
          </button>
          <button className="btn btn-success" onClick={handleDevolver} disabled={saving}>
            {saving ? 'Procesando…' : 'Confirmar devolución'}
          </button>
        </div>
      </Modal>
    </>
  );
}
