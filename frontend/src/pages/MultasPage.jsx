import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function MultasPage() {
  const [multas,   setMultas]   = useState([]);
  const [resumen,  setResumen]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filtro,   setFiltro]   = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [msg,      setMsg]      = useState({ text: '', type: '' });
  const [saving,   setSaving]   = useState(false);

  // Modal condonar
  const [modalCondonar, setModalCondonar] = useState(null); // id_multa
  const [motivo,        setMotivo]        = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: m }, { data: r }] = await Promise.all([
        api.get('/multas'),
        api.get('/multas/resumen'),
      ]);
      setMultas(m);
      setResumen(r);
    } catch {
      setMsg({ text: 'Error al cargar multas.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pagar = async (id) => {
    if (!confirm('¿Marcar esta multa como pagada?')) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/multas/${id}/pagar`);
      setMsg({ text: data.message, type: 'success' });
      fetchAll();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al registrar pago.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    }
  };

  const condonar = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/multas/${modalCondonar}/condonar`, { motivo });
      setMsg({ text: data.message, type: 'success' });
      setModalCondonar(null);
      setMotivo('');
      fetchAll();
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al condonar.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    }
  };

  // Filtrado local
  const filtradas = multas.filter(m => {
    const matchEstado  = filtro === 'TODOS' || m.estado === filtro;
    const q = busqueda.toLowerCase();
    const matchBusq = !q || m.lector?.toLowerCase().includes(q)
                          || m.codigo_lector?.toLowerCase().includes(q)
                          || m.concepto?.toLowerCase().includes(q)
                          || m.libros_prestamo?.toLowerCase().includes(q);
    return matchEstado && matchBusq;
  });

  const fmt = (val) => parseFloat(val || 0).toFixed(2);
  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) : '—';
  const fmtFechaHora = (f) => f ? new Date(f).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';

  return (
    <>
      <div className="card-header">
        <h2 style={{ color: 'var(--primary)' }}>💰 Multas</h2>
        {resumen && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-warning">
              Pendiente: S/ {fmt(resumen.monto_pendiente)}
            </span>
            <span className="badge badge-success">
              Cobrado: S/ {fmt(resumen.monto_cobrado)}
            </span>
          </div>
        )}
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}
             style={{ marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['TODOS','Todas'],['PENDIENTE','Pendientes'],['PAGADA','Pagadas'],['CONDONADA','Condonadas']].map(([k,l]) => (
          <button key={k}
            className={`btn btn-sm ${filtro === k ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFiltro(k)}>{l}
            {resumen && k !== 'TODOS' && (
              <span style={{ marginLeft: 5, opacity: .75 }}>
                ({k === 'PENDIENTE' ? resumen.total_pendientes
                  : k === 'PAGADA'  ? resumen.total_pagadas
                  : resumen.total_condonadas})
              </span>
            )}
          </button>
        ))}
        <input
          className="form-control"
          style={{ maxWidth: 260, marginLeft: 'auto' }}
          placeholder="Buscar lector, código, concepto…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {busqueda && (
          <button className="btn btn-sm btn-outline" onClick={() => setBusqueda('')}>✕</button>
        )}
      </div>

      {loading ? (
        <div className="loading">Cargando multas…</div>
      ) : filtradas.length === 0 ? (
        <div className="empty-state">
          <p>{filtro === 'PENDIENTE' ? '✅ No hay multas pendientes.' : 'No hay multas con esos criterios.'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Lector</th>
                <th>Libro(s) del préstamo</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Generada</th>
                <th>Pagada / Condonada</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(m => (
                <tr key={m.id_multa}>
                  <td style={{ color: 'var(--muted)', fontSize: '.8rem' }}>#{m.id_multa}</td>
                  <td>
                    <strong>{m.lector}</strong><br/>
                    <small className="text-muted">{m.codigo_lector}</small>
                  </td>
                  <td style={{ fontSize: '.82rem', maxWidth: 180 }}>
                    {m.libros_prestamo || <span className="text-muted">—</span>}
                  </td>
                  <td style={{ fontSize: '.87rem' }}>{m.concepto}</td>
                  <td><strong style={{ color: m.estado === 'PENDIENTE' ? 'var(--danger)' : 'inherit' }}>
                    S/ {fmt(m.monto)}
                  </strong></td>
                  <td style={{ fontSize: '.82rem' }}>{fmtFecha(m.fecha_generacion)}</td>
                  <td style={{ fontSize: '.82rem' }}>
                    {m.fecha_pago ? fmtFechaHora(m.fecha_pago) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${
                      m.estado === 'PENDIENTE'  ? 'badge-warning'
                      : m.estado === 'PAGADA'   ? 'badge-success'
                      : 'badge-primary'}`}>
                      {m.estado}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {m.estado === 'PENDIENTE' && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          style={{ marginRight: 5 }}
                          disabled={saving}
                          onClick={() => pagar(m.id_multa)}
                        >✔ Pagar</button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={saving}
                          onClick={() => { setModalCondonar(m.id_multa); setMotivo(''); }}
                        >🚫 Condonar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumen inferior */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 20 }}>
          {[
            { label: 'Total multas',   value: resumen.total,            cls: '' },
            { label: 'Pendientes',     value: resumen.total_pendientes, cls: 'warning' },
            { label: 'Pagadas',        value: resumen.total_pagadas,    cls: 'success' },
            { label: 'Condonadas',     value: resumen.total_condonadas, cls: '' },
            { label: 'Monto pendiente',value: `S/ ${fmt(resumen.monto_pendiente)}`, cls: 'danger' },
            { label: 'Total cobrado',  value: `S/ ${fmt(resumen.monto_cobrado)}`,   cls: 'success' },
          ].map(c => (
            <div key={c.label} className={`stat-card ${c.cls}`} style={{ padding: '12px 16px' }}>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{c.value}</div>
              <div className="stat-label" style={{ fontSize: '.8rem' }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modal condonar */}
      <Modal
        open={!!modalCondonar}
        onClose={() => { setModalCondonar(null); setMotivo(''); }}
        title="Condonar multa"
      >
        <p style={{ color: 'var(--muted)', marginBottom: 12, fontSize: '.92rem' }}>
          La multa quedará marcada como <strong>CONDONADA</strong> y no se podrá revertir.
        </p>
        <div className="form-group">
          <label>Motivo de la condonación <small className="text-muted">(opcional)</small></label>
          <textarea
            className="form-control"
            rows={3}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej. Error de registro, caso especial autorizado por director…"
          />
        </div>
        <div className="flex-end mt-2">
          <button
            className="btn btn-outline"
            onClick={() => { setModalCondonar(null); setMotivo(''); }}
          >Cancelar</button>
          <button
            className="btn btn-danger"
            disabled={saving}
            onClick={condonar}
          >{saving ? 'Procesando…' : 'Confirmar condonación'}</button>
        </div>
      </Modal>
    </>
  );
}
