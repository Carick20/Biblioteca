import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const initForm = {
  titulo: '', isbn: '', editorial: '', autores: '', categorias: '',
  anio_publicacion: '', idioma: 'Español', descripcion: '', numero_paginas: '', n_ejemplares: 1, n_nuevos_ejemplares: 0,
};

export default function LibrosPage() {
  const [libros,        setLibros]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [query,         setQuery]         = useState('');
  const [modal,         setModal]         = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [form,          setForm]          = useState(initForm);
  const [msg,           setMsg]           = useState({ text: '', type: '' });
  const [saving,        setSaving]        = useState(false);
  const [portadaFile,   setPortadaFile]   = useState(null);
  const [portadaPreview, setPortadaPreview] = useState(null);
  const fileInputRef = useRef(null);

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

  const resetPortada = () => {
    setPortadaFile(null);
    setPortadaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openNew = () => {
    setEditing(null);
    setForm(initForm);
    resetPortada();
    setMsg({ text: '', type: '' });
    setModal(true);
  };

  const openEdit = (libro) => {
    setEditing(libro);
    setForm({
      titulo: libro.titulo || '', isbn: libro.isbn || '',
      editorial: libro.editorial_nombre || '', autores: libro.autores || '',
      categorias: libro.categorias || '', anio_publicacion: libro.anio_publicacion || '',
      idioma: libro.idioma || 'Español', descripcion: libro.descripcion || '',
      numero_paginas: libro.numero_paginas || '', n_ejemplares: 1, n_nuevos_ejemplares: 0,
    });
    resetPortada();
    if (libro.portada_url) {
      setPortadaPreview(libro.portada_url);
    }
    setMsg({ text: '', type: '' });
    setModal(true);
  };

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handlePortadaChange = e => {
    const file = e.target.files[0];
    if (!file) { resetPortada(); return; }
    setPortadaFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPortadaPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.titulo.trim()) { setMsg({ text: 'El título es obligatorio.', type: 'error' }); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('titulo',           form.titulo.trim());
      fd.append('isbn',             form.isbn || '');
      fd.append('editorial',        form.editorial || '');
      fd.append('autores',          form.autores || '');
      fd.append('categorias',       form.categorias || '');
      fd.append('anio_publicacion', form.anio_publicacion || '');
      fd.append('idioma',           form.idioma || 'Español');
      fd.append('descripcion',      form.descripcion || '');
      fd.append('numero_paginas',   form.numero_paginas || '');
      fd.append('n_ejemplares',     String(parseInt(form.n_ejemplares, 10) || 1));
      fd.append('n_nuevos_ejemplares', String(parseInt(form.n_nuevos_ejemplares, 10) || 0));
      if (portadaFile) {
        fd.append('portada', portadaFile);
      }

      if (editing) {
        await api.put(`/libros/${editing.id_libro}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMsg({ text: 'Libro actualizado correctamente.', type: 'success' });
      } else {
        await api.post('/libros', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMsg({ text: 'Libro registrado correctamente.', type: 'success' });
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
                <th>Portada</th><th>Título</th><th>Autores</th><th>Editorial</th>
                <th>Año</th><th>Disponibles</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {libros.map(l => (
                <tr key={l.id_libro}>
                  <td style={{ width: 56, textAlign: 'center' }}>
                    {l.portada_url
                      ? <img
                          src={l.portada_url}
                          alt={`Portada de ${l.titulo}`}
                          style={{ width: 40, height: 55, objectFit: 'cover', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,.25)' }}
                        />
                      : <span style={{ fontSize: 28 }}>📖</span>
                    }
                  </td>
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
            {!editing ? (
              <div className="form-group">
                <label>Ejemplares iniciales</label>
                <input name="n_ejemplares" type="number" min="1" max="20" className="form-control" value={form.n_ejemplares} onChange={handleChange} />
              </div>
            ) : (
              <div className="form-group">
                <label>Añadir más copias (+)</label>
                <input name="n_nuevos_ejemplares" type="number" min="0" max="20" className="form-control" value={form.n_nuevos_ejemplares} onChange={handleChange} />
              </div>
            )}
          </div>

          {/* ── Campo portada ── */}
          <div className="form-group">
            <label>Portada <small className="text-muted">(JPG, PNG, WebP — máx. 5 MB)</small></label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {portadaPreview && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={portadaPreview}
                    alt="Vista previa portada"
                    style={{ width: 72, height: 100, objectFit: 'cover', borderRadius: 6,
                             boxShadow: '0 2px 8px rgba(0,0,0,.25)', border: '1px solid #ddd' }}
                  />
                  <button
                    type="button"
                    title="Quitar portada"
                    onClick={resetPortada}
                    style={{ position: 'absolute', top: -8, right: -8, background: '#e74c3c', color: '#fff',
                             border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                             fontSize: 12, lineHeight: '22px', textAlign: 'center', padding: 0 }}
                  >✕</button>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="form-control"
                  onChange={handlePortadaChange}
                  style={{ cursor: 'pointer' }}
                />
                <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>
                  {portadaFile
                    ? `Archivo seleccionado: ${portadaFile.name}`
                    : editing && portadaPreview
                      ? 'Selecciona una imagen para reemplazar la portada actual'
                      : 'Selecciona una imagen para la portada del libro'}
                </small>
              </div>
            </div>
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
