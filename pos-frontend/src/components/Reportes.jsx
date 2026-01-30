import { useState } from 'react';
import ReporteVentasGenerales from './reportes/ReporteVentasGenerales';
import ReporteVentasPorProducto from './reportes/ReporteVentasPorProducto';
import ReporteDeudas from './reportes/ReporteDeudas';
import ReporteMermas from './reportes/ReporteMermas';

export default function Reportes() {
  const [tab, setTab] = useState('ventas');
  const isActive = (value) => tab === value;

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm w-100 fs-6"
        style={{
          maxWidth: 'calc(100vw - 100px)',
          margin: '0.25rem 0', // ✅ ULTRA COMPACTO ARRIBA
        }}
      >
        {/* ✅ HEADER ULTRA COMPACTO (~42px total) */}
        <div className="card-header p-0 bg-primary text-white" style={{ minHeight: '42px' }}>
          <div className="px-2 pt-1 pb-0 d-flex justify-content-between align-items-center" style={{ fontSize: '0.85rem' }}>
            <h6 className="mb-0" style={{ fontSize: '0.95rem' }}>📊 Reportes</h6>
            <small className="opacity-75">Ventas/mermas</small>
          </div>

          {/* Tabs con tamaño legible */}
          <ul className="nav nav-tabs card-header-tabs px-2 border-0 mt-0" style={{ fontSize: '0.85rem' }}>
            {[
              { id: 'ventas', label: 'Ventas' },
              { id: 'ventasProducto', label: 'Ventas Por Producto' },
              { id: 'mermas', label: 'Mermas' },
            ].map((t) => (
              <li className="nav-item" key={t.id}>
                <button
                  type="button"
                  className={`nav-link border-0 px-3 py-1 fw-semibold ${
                    isActive(t.id)
                      ? 'bg-body text-primary shadow-sm'
                      : 'bg-primary text-white opacity-90'
                  }`}
                  style={{
                    minHeight: '30px',
                    fontSize: '0.85rem',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setTab(t.id)}
                  onMouseEnter={(e) => {
                    if (!isActive(t.id)) {
                      e.currentTarget.style.backgroundColor = '#e9ecef';
                      e.currentTarget.style.color = '#0d6efd';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(t.id)) {
                      e.currentTarget.style.backgroundColor = '';
                      e.currentTarget.style.color = '';
                    }
                  }}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contenido */}
        <div className="card-body py-3 bg-body">
          {tab === 'ventas' && <ReporteVentasGenerales />}
          {tab === 'ventasProducto' && <ReporteVentasPorProducto />}
          {tab === 'mermas' && <ReporteMermas />}
        </div>
      </div>
    </div>
  );
}
