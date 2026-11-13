import { useEffect, useState } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [stats,  setStats]  = useState(null);
  const [top,    setTop]    = useState([]);
  const [inv,    setInv]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,  setError]  = useState('');

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then(({ data }) => {
        setStats(data.stats);
        setTop(data.top_libros);
        setInv(data.inventario);
      })
      .catch(() => setError('Error al cargar el dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando dashboard…</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const cards = [
    { label: 'Títulos activos',      value: stats.total_libros,        cls: '' },
    { label: 'Ejemplares disponibles', value: stats.disponibles,       cls: 'success' },
    { label: 'Préstamos activos',    value: stats.prestamos_activos,   cls: '' },
    { label: 'Préstamos vencidos',   value: stats.prestamos_vencidos,  cls: stats.prestamos_vencidos > 0 ? 'danger' : '' },
    { label: 'Multas pendientes',    value: stats.multas_pendientes,   cls: stats.multas_pendientes  > 0 ? 'warning' : '' },
    { label: 'Lectores activos',     value: stats.lectores_activos,    cls: '' },
    { label: 'Monto multas (S/)',    value: parseFloat(stats.monto_multas || 0).toFixed(2), cls: '' },
  ];

  return (
    <>
      <h2 style={{ marginBottom: '20px', color: 'var(--primary)' }}>📊 Dashboard</h2>

      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top libros */}
        <div className="card">
          <div className="card-header"><h2>📖 Libros más prestados</h2></div>
          {top.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Título</th><th>Préstamos</th></tr></thead>
                <tbody>
                  {top.map((t, i) => (
                    <tr key={i}>
                      <td>{t.titulo}</td>
                      <td><span className="badge badge-primary">{t.total_prestamos}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-muted">Sin datos aún.</p>}
        </div>

        {/* Inventario */}
        <div className="card">
          <div className="card-header"><h2>📦 Inventario por estado</h2></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Estado</th><th>Ejemplares</th></tr></thead>
              <tbody>
                {inv.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`badge ${
                        row.estado === 'DISPONIBLE' ? 'badge-success'
                        : row.estado === 'PRESTADO' ? 'badge-primary'
                        : 'badge-danger'}`}>{row.estado}</span>
                    </td>
                    <td>{row.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
