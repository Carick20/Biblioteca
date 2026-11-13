import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

export default function MultasPage() {
  const [multas,  setMultas]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState('TODOS'); // TODOS | PENDIENTE | PAGADA
  const [msg,     setMsg]     = useState('');

  const fetchMultas = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/multas');
      setMultas(data);
    } catch {
      setMsg('Error al cargar multas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMultas(); }, [fetchMultas]);

  const pagar = async (id) => {
    if (!confirm('¿Marcar esta multa como pagada?')) return;
    try {
      const { data } = await api.patch(`/multas/${id}/pagar`);
      setMsg(data.message);
      fetchMultas();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Error al registrar pago.');
    }
  };

  const filtradas = multas.filter(m => filtro === 'TODOS' || m.estado === filtro);

  const totalPendiente = multas
    .filter(m => m.estado === 'PENDIENTE')
    .reduce((s, m) => s + parseFloat(m.monto), 0);

  return (
    <>
      <div className="card-header">
        <h2 style={{ color: 'var(--primary)' }}>💰 Multas</h2>
        <span className={`badge ${totalPendiente > 0 ? 'badge-danger' : 'badge-success'}`}>
          Pendiente: S/ {totalPendiente.toFixed(2)}
        </span>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['TODOS','Todas'],['PENDIENTE','Pendientes'],['PAGADA','Pagadas']].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${filtro === k ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFiltro(k)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Cargando multas…</div>
      ) : filtradas.length === 0 ? (
        <div className="empty-state">
          <p>{filtro === 'PENDIENTE' ? '✅ No hay multas pendientes.' : 'No hay multas.'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Lector</th><th>Concepto</th><th>Monto</th>
                <th>Fecha generación</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(m => (
                <tr key={m.id_multa}>
                  <td>
                    {m.lector}<br/>
                    <small className="text-muted">{m.codigo_lector}</small>
                  </td>
                  <td>{m.concepto}</td>
                  <td><strong>S/ {parseFloat(m.monto).toFixed(2)}</strong></td>
                  <td>{new Date(m.fecha_generacion).toLocaleDateString('es-PE')}</td>
                  <td>
                    <span className={`badge ${m.estado === 'PENDIENTE' ? 'badge-warning' : 'badge-success'}`}>
                      {m.estado}
                    </span>
                  </td>
                  <td>
                    {m.estado === 'PENDIENTE' && (
                      <button className="btn btn-success btn-sm" onClick={() => pagar(m.id_multa)}>
                        ✔ Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt-3" style={{ maxWidth: 340 }}>
        <h3 style={{ marginBottom: 10, color: 'var(--muted)', fontSize: '.95rem' }}>Resumen</h3>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr><td>Total multas</td><td><strong>{multas.length}</strong></td></tr>
            <tr><td>Pendientes</td>
              <td><strong className="text-danger">{multas.filter(m => m.estado === 'PENDIENTE').length}</strong></td>
            </tr>
            <tr><td>Pagadas</td>
              <td><strong className="text-success">{multas.filter(m => m.estado === 'PAGADA').length}</strong></td>
            </tr>
            <tr><td>Monto pendiente</td>
              <td><strong>S/ {totalPendiente.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
