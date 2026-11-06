import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ReportesPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setError('Error al cargar reportes.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando reportes…</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const { stats, top_libros, inventario } = data;

  return (
    <>
      <h2 style={{ color: 'var(--primary)', marginBottom: 20 }}>📈 Reportes</h2>

      {/* Estadísticas generales */}
      <div className="card">
        <div className="card-header"><h2>Estadísticas generales</h2></div>
        <table style={{ width: '100%' }}>
          <tbody>
            {[
              ['Total de títulos activos',        stats.total_libros],
              ['Ejemplares disponibles',           stats.disponibles],
              ['Préstamos activos',                stats.prestamos_activos],
              ['Préstamos vencidos',               stats.prestamos_vencidos],
              ['Multas pendientes',                stats.multas_pendientes],
              ['Monto multas pendientes (S/)',     parseFloat(stats.monto_multas || 0).toFixed(2)],
              ['Lectores activos',                 stats.lectores_activos],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '8px 0', color: 'var(--muted)', fontSize: '.9rem' }}>{k}</td>
                <td style={{ padding: '8px 0', fontWeight: 700 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {/* Libros más prestados */}
        <div className="card">
          <div className="card-header"><h2>📚 Libros más prestados</h2></div>
          {top_libros.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>Título</th><th>Préstamos</th></tr></thead>
                <tbody>
                  {top_libros.map((t, i) => (
                    <tr key={i}>
                      <td><strong>{i + 1}</strong></td>
                      <td>{t.titulo}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            height: 10, borderRadius: 5, background: 'var(--primary)',
                            width: `${Math.min(120, (t.total_prestamos / (top_libros[0]?.total_prestamos || 1)) * 120)}px`
                          }} />
                          {t.total_prestamos}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted">Sin registros de préstamos aún.</p>}
        </div>

        {/* Inventario por estado */}
        <div className="card">
          <div className="card-header"><h2>📦 Inventario por estado</h2></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Estado</th><th>Cant.</th><th>%</th></tr></thead>
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
                          : 'badge-danger'}`}>
                          {row.estado}
                        </span>
                      </td>
                      <td>{row.cantidad}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: `${pct}px`, height: 10, background: 'var(--accent)', borderRadius: 4, minWidth: 4 }} />
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
    </>
  );
}
