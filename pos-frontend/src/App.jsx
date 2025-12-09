import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Carrito from './components/Carrito';
import Merma from './components/Merma';
import ConsultaVentas from './components/ConsultaVentas';
import AltasProductos from './components/AltasProductos';
import Cuentas from './components/Cuentas';
import Reportes from './components/Reportes';

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-3">
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
                <NavLink to="/consultaventas" className="nav-link">
                  Consulta de ventas
                </NavLink>
              </li>
             <li className="nav-item">
  <NavLink to="/altasProductos" className="nav-link">Productos</NavLink>
</li>
<li className="nav-item">
  <NavLink to="/cuentas" className="nav-link">Cuentas</NavLink>
</li>
 <li className="nav-item">
                <NavLink to="/reportes" className="nav-link">
                  Reportes
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main className="container my-3">
        <Routes>
          <Route path="/" element={<Carrito />} />
          <Route path="/ventas" element={<Carrito />} />
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
