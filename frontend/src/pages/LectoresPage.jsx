import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const initForm = {
  tipo_documento: 'DNI', numero_documento: '', nombres: '',
  apellidos: '', correo: '', telefono: '', direccion: '', id_tipo_lector: '',
};

export default function LectoresPage() {
  const [lectores,    setLectores]    = useState([]);
  const [tipos,       setTipos]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [actividadModal, setActividadModal] = useState(null); // datos de actividad
  const [loadingAct,  setLoadingAct]  = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(initForm);
  const [msg,         setMsg]         = useState({ text: '', type: '' });
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: l }, { data: t }] = await Promise.all([
        api.get('/lectores'),
        api.get('/catalogo/tipos-lector'),
      ]);
      setLectores(l);
      setTipos(t);
    } catch {
      setMsg({ text: 'Error al cargar lectores.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew  = () => {
    setEditing(null);
    setForm({ ...initForm, id_tipo_lector: tipos[0]?.id_tipo_lector || '' });
    setMsg({ text: '', type: '' });
    setModal(true);
  };
  const openEdit = l => {
    setEditing(l);
    setForm({
      tipo_documento: l.tipo_documento || 'DNI',
      numero_documento: l.numero_documento || '',
      nombres: l.nombres || '', apellidos: l.apellidos || '',
      correo: l.correo || '', telefono: l.telefono || '',
      direccion: l.direccion || '', id_tipo_lector: l.id_tipo_lector || '',
    });
    setMsg({ text: '', type: '' });
    setModal(true);
  };

  const openActividad = async (l) => {
    setLoadingAct(true);
    setActividadModal({ lector: l, loading: true });
    try {
      const { data } = await api.get(`/lectores/${l.id_lector}/actividad`);
      setActividadModal(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cargar actividad del lector.');
      setActividadModal(null);
    } finally {
      setLoadingAct(false);
    }
  };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    const { numero_documento, nombres, apellidos, id_tipo_lector } = form;
    if (!numero_documento || !nombres || !apellidos || !id_tipo_lector) {
      setMsg({ text: 'Completa los campos obligatorios (*).' , type: 'error' }); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/lectores/${editing.id_lector}`, form);
        setMsg({ text: 'Lector actualizado.', type: 'success' });
      } else {
        await api.post('/lectores', form);
        setMsg({ text: 'Lector registrado.', type: 'success' });
      }
      await fetchAll();
      setTimeout(() => setModal(false), 900);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al guardar.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async l => {
    if (!confirm(`¿Dar de baja al lector "${l.nombre_completo}"?`)) return;
    try { await api.delete(`/lectores/${l.id_lector}`); fetchAll(); }
    catch { alert('No se pudo dar de baja al lector.'); }
  };

  const filtered = lectores.filter(l =>
    [l.nombre_completo, l.numero_documento, l.codigo_lector, l.tipo_lector]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()))
  );

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="card-header">
        <h2 style={{ color: 'var(--primary)' }}>👥 Lectores</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo lector</button>
      </div>

      <div className="search-bar">
        <input
          className="form-control"
          placeholder="Buscar por nombre, DNI, código…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Cargando lectores…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No se encontraron lectores.</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Nombre</th><th>Documento</th>
                <th>Tipo</th><th>Vence</th><th>Estado</th><th>Solvencia</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id_lector}>
                  <td><code>{l.codigo_lector}</code></td>
                  <td>{l.nombre_completo}</td>
                  <td>{l.tipo_documento}: {l.numero_documento}</td>
                  <td>{l.tipo_lector}</td>
                  <td className={l.fecha_vencimiento < hoy ? 'text-danger' : ''}>
                    {l.fecha_vencimiento || '—'}
                  </td>
                  <td>
                    <span className={`badge ${l.estado === 'ACTIVO' ? 'badge-success' : 'badge-muted'}`}>
                      {l.estado}
                    </span>
                  </td>
                  <td>
                    {l.es_apto ? (
                      <span className="badge badge-success">Apto</span>
                    ) : (
                      <span className="badge badge-danger" title={l.motivo_no_apto}>No Apto</span>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => openActividad(l)} title="Ver Actividad">📊</button>
                    <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(l)} title="Editar">✏️</button>
                    {l.estado === 'ACTIVO' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)} title="Dar de baja">🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Actividad / Solvencia */}
      <Modal open={!!actividadModal} onClose={() => setActividadModal(null)} title="Historial y Actividad del Lector">
        {loadingAct ? (
          <div className="loading">Cargando actividad…</div>
        ) : actividadModal && actividadModal.lector ? (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card, #f8f9fa)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>{actividadModal.lector.nombre_completo}</h4>
              <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>Código: <code>{actividadModal.lector.codigo_lector}</code> | Doc: {actividadModal.lector.tipo_documento} {actividadModal.lector.numero_documento}</p>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${actividadModal.estado_solvencia === 'Apto' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
                  Estado Solvencia: {actividadModal.estado_solvencia}
                </span>
                {actividadModal.motivo_bloqueo !== 'Ninguno' && (
                  <p style={{ margin: '6px 0 0', color: 'var(--danger)', fontSize: '0.85rem' }}>
                    <strong>Motivo bloqueo:</strong> {actividadModal.motivo_bloqueo}
                  </p>
                )}
              </div>
            </div>

            <h5 style={{ marginBottom: 8, color: 'var(--muted)' }}>Resumen de Métricas</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
              <div className="card" style={{ padding: 10, textAlign: 'center' }}>
                <small className="text-muted">Históricos</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{actividadModal.metricas.total_historicos}</div>
              </div>
              <div className="card" style={{ padding: 10, textAlign: 'center' }}>
                <small className="text-muted">Activos</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{actividadModal.metricas.activos_actuales}</div>
              </div>
              <div className="card" style={{ padding: 10, textAlign: 'center' }}>
                <small className="text-muted">A tiempo</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{actividadModal.metricas.devueltos_a_tiempo}</div>
              </div>
              <div className="card" style={{ padding: 10, textAlign: 'center' }}>
                <small className="text-muted">Con atraso</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{actividadModal.metricas.devueltos_con_atraso}</div>
              </div>
              <div className="card" style={{ padding: 10, textAlign: 'center' }}>
                <small className="text-muted">Deuda Total</small>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--danger)' }}>S/ {actividadModal.metricas.deuda_total}</div>
              </div>
            </div>

            <h5 style={{ marginBottom: 8, color: 'var(--muted)' }}>Historial Cronológico de Actividad</h5>
            <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <table style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead>
                  <tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr>
                </thead>
                <tbody>
                  {actividadModal.historial.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)', padding: 12 }}>Sin actividad registrada.</td></tr>
                  ) : actividadModal.historial.map((h, idx) => (
                    <tr key={idx}>
                      <td>{new Date(h.fecha).toLocaleString('es-PE')}</td>
                      <td>
                        <span className={`badge ${h.tipo.includes('MULTA') ? (h.tipo === 'MULTA_PAGADA' ? 'badge-success' : 'badge-danger') : 'badge-primary'}`}>
                          {h.tipo}
                        </span>
                      </td>
                      <td>{h.descripcion}</td>
                      <td>{h.monto ? `S/ ${parseFloat(h.monto).toFixed(2)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex-end mt-2">
              <button className="btn btn-outline" onClick={() => setActividadModal(null)}>Cerrar</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar lector' : 'Nuevo lector'}>
        {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label>Nombres *</label>
              <input name="nombres" className="form-control" value={form.nombres} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Apellidos *</label>
              <input name="apellidos" className="form-control" value={form.apellidos} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo Doc.</label>
              <select name="tipo_documento" className="form-control" value={form.tipo_documento} onChange={handleChange}>
                {['DNI','CE','Pasaporte','RUC'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nº Documento *</label>
              <input name="numero_documento" className="form-control" value={form.numero_documento} onChange={handleChange} required disabled={!!editing} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de lector *</label>
              <select name="id_tipo_lector" className="form-control" value={form.id_tipo_lector} onChange={handleChange} required>
                <option value="">— Seleccionar —</option>
                {tipos.map(t => <option key={t.id_tipo_lector} value={t.id_tipo_lector}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Correo</label>
              <input name="correo" type="email" className="form-control" value={form.correo} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input name="telefono" className="form-control" value={form.telefono} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input name="direccion" className="form-control" value={form.direccion} onChange={handleChange} />
            </div>
          </div>
          <div className="flex-end mt-2">
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : (editing ? 'Actualizar' : 'Registrar')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
