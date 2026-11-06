import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const initForm = {
  titulo: '', isbn: '', editorial: '', autores: '', categorias: '',
  anio_publicacion: '', idioma: 'Español', descripcion: '', numero_paginas: '', n_ejemplares: 1,
};

export default function LibrosPage() {
  const [libros,  setLibros]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(initForm);
  const [msg,     setMsg]     = useState({ text: '', type: '' });
  const [saving,  setSaving]  = useState(false);

  const fetchLibros = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/libros?q=${encodeURIComponent(q)}`);
      setLibros(data.data || data);
    } catch {
      setMsg({ text: 'Error al cargar libros.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLibros(); }, [fetchLibros]);

  const handleSearch = e => {
    e.preventDefault();
    fetchLibros(query);
  };

  const openNew = () => { setEditing(null); setForm(initForm); setMsg({ text: '', type: '' }); setModal(true); };
  const openEdit = (libro) => {
    setEditing(libro);
    setForm({
      titulo: libro.titulo || '', isbn: libro.isbn || '',
      editorial: libro.editorial_nombre || '', autores: libro.autores || '',
      categorias: libro.categorias || '', anio_publicacion: libro.anio_publicacion || '',
      idioma: libro.idioma || 'Español', descripcion: libro.descripcion || '',
      numero_paginas: libro.numero_paginas || '', n_ejemplares: 1,
    });
    setMsg({ text: '', type: '' });
    setModal(true);
  };

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.titulo.trim()) { setMsg({ text: 'El título es obligatorio.', type: 'error' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        autores:    form.autores.split(',').map(s => s.trim()).filter(Boolean),
        categorias: form.categorias.split(',').map(s => s.trim()).filter(Boolean),
        anio_publicacion: form.anio_publicacion ? parseInt(form.anio_publicacion, 10) : null,
        numero_paginas:   form.numero_paginas   ? parseInt(form.numero_paginas,   10) : null,
        n_ejemplares:     parseInt(form.n_ejemplares, 10) || 1,
      };

      if (editing) {
        await api.put(`/libros/${editing.id_libro}`, payload);
        setMsg({ text: 'Libro actualizado.', type: 'success' });
      } else {
        await api.post('/libros', payload);
        setMsg({ text: 'Libro registrado.', type: 'success' });
      }
      await fetchLibros(query);
      setTimeout(() => setModal(false), 900);
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Error al guardar.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (libro) => {
    if (!confirm(`¿Dar de baja el libro "${libro.titulo}"?`)) return;
    try {
      await api.delete(`/libros/${libro.id_libro}`);
      fetchLibros(query);
    } catch {
      alert('No se pudo dar de baja el libro.');
    }
  };

  return (
    <>
      <div className="card-header">
        <h2 style={{ color: 'var(--primary)' }}>📖 Libros</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Nuevo libro</button>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          className="form-control"
          placeholder="Buscar por título, autor o ISBN…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-outline">Buscar</button>
        {query && <button type="button" className="btn btn-outline" onClick={() => { setQuery(''); fetchLibros(''); }}>Limpiar</button>}
      </form>

      {loading ? (
        <div className="loading">Cargando libros…</div>
      ) : libros.length === 0 ? (
        <div className="empty-state"><p>No se encontraron libros.</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Título</th><th>Autores</th><th>Editorial</th>
                <th>Año</th><th>Disponibles</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {libros.map(l => (
                <tr key={l.id_libro}>
                  <td><strong>{l.titulo}</strong>{l.isbn && <><br/><small className="text-muted">ISBN: {l.isbn}</small></>}</td>
                  <td>{l.autores || '—'}</td>
                  <td>{l.editorial_nombre || '—'}</td>
                  <td>{l.anio_publicacion || '—'}</td>
                  <td>
                    <span className={`badge ${l.disponibles > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {l.disponibles ?? 0} / {l.total_ejemplares ?? 0}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(l)}>✏️ Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑 Baja</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar libro' : 'Nuevo libro'}>
        {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group" style={{ flex: '2 1 200px' }}>
              <label>Título *</label>
              <input name="titulo" className="form-control" value={form.titulo} onChange={handleChange} required />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px' }}>
              <label>ISBN</label>
              <input name="isbn" className="form-control" value={form.isbn} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Autor(es) <small className="text-muted">(separar con coma)</small></label>
              <input name="autores" className="form-control" value={form.autores} onChange={handleChange} placeholder="Nombre Apellido, Nombre2 Apellido2" />
            </div>
            <div className="form-group">
              <label>Editorial</label>
              <input name="editorial" className="form-control" value={form.editorial} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Categorías <small className="text-muted">(separar con coma)</small></label>
              <input name="categorias" className="form-control" value={form.categorias} onChange={handleChange} placeholder="Literatura, Ciencia…" />
            </div>
            <div className="form-group">
              <label>Idioma</label>
              <select name="idioma" className="form-control" value={form.idioma} onChange={handleChange}>
                {['Español','Inglés','Portugués','Francés','Alemán','Otro'].map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Año de publicación</label>
              <input name="anio_publicacion" type="number" min="1000" max={new Date().getFullYear()} className="form-control" value={form.anio_publicacion} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Nº páginas</label>
              <input name="numero_paginas" type="number" min="1" className="form-control" value={form.numero_paginas} onChange={handleChange} />
            </div>
            {!editing && (
              <div className="form-group">
                <label>Ejemplares</label>
                <input name="n_ejemplares" type="number" min="1" max="20" className="form-control" value={form.n_ejemplares} onChange={handleChange} />
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea name="descripcion" className="form-control" rows="3" value={form.descripcion} onChange={handleChange} />
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
