import { useState } from 'react';
import ReporteVentasGenerales from './reportes/ReporteVentasGenerales';
import ReporteVentasPorProducto from './reportes/ReporteVentasPorProducto';
import ReporteDeudas from './reportes/ReporteDeudas';
import ReporteMermas from './reportes/ReporteMermas';

export default function Reportes() {
  const [tab, setTab] = useState('ventas');

  return (
    <div className="card shadow-sm">
      <div className="card-header py-2">
        <ul className="nav nav-tabs card-header-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'ventas' ? 'active' : ''}`}
              onClick={() => setTab('ventas')}
            >
              Ventas generales
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'ventasProducto' ? 'active' : ''}`}
              onClick={() => setTab('ventasProducto')}
            >
              Ventas por producto
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'deudas' ? 'active' : ''}`}
              onClick={() => setTab('deudas')}
            >
              Deudas no saldadas
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'mermas' ? 'active' : ''}`}
              onClick={() => setTab('mermas')}
            >
              Mermas
            </button>
          </li>
        </ul>
      </div>
      <div className="card-body py-3">
        {tab === 'ventas' && <ReporteVentasGenerales />}
        {tab === 'ventasProducto' && <ReporteVentasPorProducto />}
        {tab === 'deudas' && <ReporteDeudas />}
        {tab === 'mermas' && <ReporteMermas />}
      </div>
    </div>
  );
}
