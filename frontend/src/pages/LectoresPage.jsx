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
                <th>Tipo</th><th>Vence</th><th>Estado</th><th>Acciones</th>
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
                    <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(l)}>✏️</button>
                    {l.estado === 'ACTIVO' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
