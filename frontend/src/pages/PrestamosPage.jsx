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
  const [modalDev,    setModalDev]    = useState(null); // id_detalle
  const [form,        setForm]        = useState({ id_lector: '', id_ejemplares: [] });
  const [estadoEj,    setEstadoEj]    = useState('DISPONIBLE');
  const [msg,         setMsg]         = useState({ text: '', type: '' });
  const [saving,      setSaving]      = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: l }, { data: d }, { data: h }] = await Promise.all([
        api.get('/prestamos'),
        api.get('/lectores'),
        api.get('/catalogo/ejemplares-disponibles'),
        api.get('/prestamos/historial'),
      ]);
      setPrestamos(p);
      setLectores(l.filter(x => x.estado === 'ACTIVO'));
      setDisponibles(d);
      setHistorial(h);
    } catch {
      setMsg({ text: 'Error al cargar datos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      setTimeout(() => setModal(false), 1200);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al registrar préstamo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDevolver = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/prestamos/devolver/${modalDev}`, { estado_ejemplar: estadoEj });
      alert(data.message);
      setModalDev(null);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al devolver.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenovar = async (id_detalle) => {
    try {
      const { data } = await api.post(`/prestamos/renovar/${id_detalle}`);
      alert(data.message);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo renovar.');
    }
  };

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="card-header">
        <h2 style={{ color: 'var(--primary)' }}>🔄 Préstamos</h2>
        <button className="btn btn-primary btn-sm" onClick={openNuevo}>+ Nuevo préstamo</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['activos','Activos'],['historial','Historial']].map(([k,l]) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-outline'} btn-sm`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando préstamos…</div>
      ) : tab === 'activos' ? (
        prestamos.length === 0 ? (
          <div className="empty-state"><p>No hay préstamos activos.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Libro</th><th>Ejemplar</th><th>Lector</th><th>Vence</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {prestamos.map(p => (
                  <tr key={p.id_detalle}>
                    <td>{p.titulo}</td>
                    <td><code>{p.codigo_barras}</code></td>
                    <td>{p.lector}<br/><small className="text-muted">{p.codigo_lector}</small></td>
                    <td className={p.dias_vencido > 0 ? 'text-danger' : ''}>
                      {p.fecha_devolucion_programada}
                      {p.dias_vencido > 0 && <><br/><small>Vencido {p.dias_vencido}d</small></>}
                    </td>
                    <td>
                      {p.renovaciones > 0 && <span className="badge badge-primary">{p.renovaciones} renov.</span>}
                      {p.dias_vencido > 0 && <span className="badge badge-danger ml-1">Vencido</span>}
                    </td>
                    <td>
                      <button className="btn btn-success btn-sm" style={{ marginRight: 6 }} onClick={() => { setEstadoEj('DISPONIBLE'); setModalDev(p.id_detalle); }}>
                        ↩ Devolver
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleRenovar(p.id_detalle)}>
                        🔁 Renovar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Historial */
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Libro</th><th>Lector</th><th>Fecha préstamo</th><th>Fecha devol.</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {historial.map((h, i) => (
                <tr key={i}>
                  <td>{h.titulo}</td>
                  <td>{h.lector}</td>
                  <td>{new Date(h.fecha_prestamo).toLocaleDateString('es-PE')}</td>
                  <td>{h.fecha_devolucion ? new Date(h.fecha_devolucion).toLocaleDateString('es-PE') : <span className="text-muted">—</span>}</td>
                  <td>
                    <span className={`badge ${
                      h.estado_detalle === 'ACTIVO'    ? 'badge-primary'
                      : h.estado_detalle === 'DEVUELTO' ? 'badge-success'
                      : 'badge-danger'}`}>{h.estado_detalle}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo préstamo */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar nuevo préstamo">
        {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}
        <form onSubmit={handlePrestar}>
          <div className="form-group">
            <label>Lector *</label>
            <select name="id_lector" className="form-control" value={form.id_lector}
              onChange={e => setForm(f => ({ ...f, id_lector: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {lectores.map(l => (
                <option key={l.id_lector} value={l.id_lector}>
                  {l.nombre_completo} ({l.codigo_lector})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Ejemplares disponibles * <small className="text-muted">(selecciona uno o varios)</small></label>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px' }}>
              {disponibles.length === 0 ? (
                <p className="text-muted">No hay ejemplares disponibles.</p>
              ) : disponibles.map(d => (
                <label key={d.id_ejemplar} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.id_ejemplares.includes(d.id_ejemplar)}
                    onChange={() => toggleEjemplar(d.id_ejemplar)}
                  />
                  <span>{d.titulo} — <code>{d.codigo_barras}</code></span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex-end mt-2">
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Registrando…' : 'Registrar préstamo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal devolución */}
      <Modal open={!!modalDev} onClose={() => setModalDev(null)} title="Registrar devolución">
        <div className="form-group">
          <label>Estado del ejemplar devuelto</label>
          <select className="form-control" value={estadoEj} onChange={e => setEstadoEj(e.target.value)}>
            <option value="DISPONIBLE">Buen estado</option>
            <option value="DAÑADO">Dañado</option>
            <option value="PERDIDO">Perdido</option>
          </select>
        </div>
        <div className="flex-end mt-2">
          <button className="btn btn-outline" onClick={() => setModalDev(null)}>Cancelar</button>
          <button className="btn btn-success" onClick={handleDevolver} disabled={saving}>
            {saving ? 'Procesando…' : 'Confirmar devolución'}
          </button>
        </div>
      </Modal>
    </>
  );
}
