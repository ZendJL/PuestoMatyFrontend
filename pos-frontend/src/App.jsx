import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Venta from './components/Venta/Venta';
import Merma from './components/Merma';
import ConsultaVentas from './components/ConsultaVentas';
import AltasProductos from './components/AltasProductos';
import Cuentas from './components/Cuentas';
import Reportes from './components/Reportes';
import { useTheme } from './hooks/useTheme';

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      {/* Navbar: azul clásico en claro, adaptada en oscuro */}
      <nav
        className={`navbar navbar-expand-lg mb-3 ${
          theme === 'light' ? 'navbar-dark bg-primary' : 'bg-body border-bottom'
        }`}
        data-bs-theme={theme}
      >
        <div className="container-fluid">
          <span className="navbar-brand fw-bold">Puesto Maty</span>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink to="/ventas" className="nav-link">
                  Ventas
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/merma" className="nav-link">
                  Merma
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/altasProductos" className="nav-link">
                  Productos
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/cuentas" className="nav-link">
                  Cuentas
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/reportes" className="nav-link">
                  Consultas
                </NavLink>
              </li>
            </ul>

            {/* Switch modo claro / oscuro */}
            <div className="d-flex align-items-center">
              <div
                className={`form-check form-switch mb-0 ${
                  theme === 'light' ? 'text-light' : ''
                }`}
              >
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="darkModeSwitch"
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                />
                <label
                  className="form-check-label small ms-1"
                  htmlFor="darkModeSwitch"
                >
                  {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                </label>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container my-3">
        <Routes>
          <Route path="/" element={<Venta />} />
          <Route path="/ventas" element={<Venta />} />
          <Route path="/merma" element={<Merma />} />
          <Route path="/consultaventas" element={<ConsultaVentas />} />
          <Route path="/altasProductos" element={<AltasProductos />} />
          <Route path="/cuentas" element={<Cuentas />} />
          <Route path="/reportes" element={<Reportes />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
