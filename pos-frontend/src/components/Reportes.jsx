import { useState } from 'react';
import ReporteVentasGenerales from './reportes/ReporteVentasGenerales';
import ReporteVentasPorProducto from './reportes/ReporteVentasPorProducto';
import ReporteDeudas from './reportes/ReporteDeudas';
import ReporteMermas from './reportes/ReporteMermas';

const TABS = [
  { id: 'ventas',         label: 'Ventas',             icon: 'bi-bar-chart-line-fill',  color: 'primary' },
  { id: 'ventasProducto', label: 'Por Producto',        icon: 'bi-box-seam-fill',        color: 'success' },
  { id: 'mermas',         label: 'Mermas',              icon: 'bi-trash3-fill',          color: 'danger'  },
];

export default function Reportes() {
  const [tab, setTab] = useState('ventas');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>

      {/* HEADER */}
      <div className="bg-primary text-white px-4 py-2 flex-shrink-0 d-flex align-items-center justify-content-between" style={{ minHeight: 52 }}>
        <div>
          <h5 className="mb-0 fw-bold">📊 Reportes</h5>
          <small className="opacity-75">Consulta y análisis de ventas, productos y mermas</small>
        </div>
      </div>

      {/* TABS — grandes y claros */}
      <div className="flex-shrink-0 border-bottom bg-body d-flex" style={{ padding: '0 1rem' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`d-flex align-items-center gap-2 fw-bold border-0 px-4 py-3 ${
              tab === t.id
                ? `text-${t.color} border-bottom border-3 border-${t.color} bg-body`
                : 'text-secondary bg-body'
            }`}
            style={{
              fontSize: '1rem',
              borderBottom: tab === t.id ? `3px solid` : '3px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              transition: 'color 0.15s',
              background: 'none',
            }}
          >
            <i className={`bi ${t.icon} fs-5`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div className="flex-fill overflow-auto p-3">
        {tab === 'ventas'         && <ReporteVentasGenerales />}
        {tab === 'ventasProducto' && <ReporteVentasPorProducto />}
        {tab === 'mermas'         && <ReporteMermas />}
      </div>
    </div>
  );
}
