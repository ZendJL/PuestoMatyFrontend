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
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Header azul con tabs */}
        <div className="card-header p-0 bg-primary text-white">
          <div className="px-3 pt-2 pb-1 d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Reportes</h5>
            <span className="small text-white-50">Ventas y mermas</span>
          </div>

          <ul className="nav nav-tabs card-header-tabs px-2 border-0 mt-1">
            {[
              { id: 'ventas', label: 'Ventas' },
              { id: 'ventasProducto', label: 'Ventas por producto' },
              { id: 'mermas', label: 'Mermas' },
            ].map((t) => (
              <li className="nav-item" key={t.id}>
                <button
                  type="button"
                  className={`nav-link border-0 ${
                    isActive(t.id)
                      ? 'bg-body text-primary fw-semibold'
                      : 'bg-primary text-white'
                  }`}
                  onClick={() => setTab(t.id)}
                  style={{
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(t.id)) {
                      e.currentTarget.classList.remove('bg-primary', 'text-white');
                      e.currentTarget.classList.add('bg-body', 'text-primary');
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(t.id)) {
                      e.currentTarget.classList.remove('bg-body', 'text-primary');
                      e.currentTarget.classList.add('bg-primary', 'text-white');
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
