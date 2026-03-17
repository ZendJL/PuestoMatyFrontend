import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Venta from './components/Venta/Venta';
import Merma from './components/Merma/Merma';
import Productos from './components/Productos/Productos';
import Cuentas from './components/Cuentas';
import Reportes from './components/Reportes';
import { useTheme } from './hooks/useTheme';
import { formatMoney } from './utils/format';

import Proveedores from './components/Proveedores/Proveedores';

const NAV_LINKS = [
  { to: '/ventas', icon: 'bi-cart-fill', label: 'Ventas', color: '#28a745' },
  { to: '/merma', icon: 'bi-trash3-fill', label: 'Merma', color: '#dc3545' },
  { to: '/productos', icon: 'bi-box-seam-fill', label: 'Productos', color: '#0d6efd' },
  { to: '/cuentas', icon: 'bi-people-fill', label: 'Cuentas', color: '#6f42c1' },
  { to: '/reportes', icon: 'bi-bar-chart-fill', label: 'Reportes', color: '#fd7e14' },

  { to: '/proveedores', icon: 'bi-truck', label: 'Proveedores', color: '#20c997' },
];

function ResumenDia() {
  const hoy = new Date().toISOString().substring(0, 10);
  const { data } = useQuery({
    queryKey: ['resumen-dia', hoy],
    queryFn: () => axios.get(`/api/ventas/reporte-generales?desde=${hoy}&hasta=${hoy}`).then(r => r.data),
    staleTime: 60_000,
  });

  if (!data?.length) return null;

  const totalDia = data.reduce((s, v) => s + (v.total || 0), 0);
  const numVentas = data.length;

  return (
    <div className="d-flex align-items-center gap-3 px-3 py-2 bg-success bg-opacity-10 border-bottom border-success border-opacity-25">
      <span className="text-success fw-bold" style={{ fontSize: '0.85rem' }}>
        📅 Hoy: <strong>{numVentas}</strong> venta{numVentas !== 1 ? 's' : ''} &nbsp;|&nbsp;
        Total: <strong>{formatMoney(totalDia)}</strong>
      </span>
    </div>
  );
}

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <nav
        className={`navbar navbar-expand-lg ${theme === 'light' ? 'navbar-dark bg-primary' : 'bg-body border-bottom'
          }`}
        data-bs-theme={theme}
      >
        <div className="container-fluid">
          <span className="navbar-brand fw-bold fs-5">🛒 Puesto Maty</span>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
              {NAV_LINKS.map(({ to, icon, label }) => (
                <li className="nav-item" key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded fw-semibold ${isActive ? 'bg-white bg-opacity-25 text-white' : 'text-white-50'
                      }`
                    }
                    style={{ fontSize: '1rem', minHeight: '44px' }}
                  >
                    <i className={`bi ${icon} fs-5`} />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center">
              <div className={`form-check form-switch mb-0 ${theme === 'light' ? 'text-light' : ''}`}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="darkModeSwitch"
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                  style={{ width: '2.5em', height: '1.4em', cursor: 'pointer' }}
                />
                <label className="form-check-label ms-1 fs-6" htmlFor="darkModeSwitch">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </label>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <ResumenDia />

      <main className="container my-3">
        <Routes>
          <Route path="/" element={<Venta />} />
          <Route path="/ventas" element={<Venta />} />
          <Route path="/merma" element={<Merma />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/cuentas" element={<Cuentas />} />
          <Route path="/reportes" element={<Reportes />} />

          <Route path="/proveedores" element={<Proveedores />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
