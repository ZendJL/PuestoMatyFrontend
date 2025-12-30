import { formatMoney } from '../../utils/format';

export default function CuentaPrestamo({
  cuentas,
  cuentaSeleccionada,
  setCuentaSeleccionada,
  busquedaCuenta,
  setBusquedaCuenta,
  formatMoney,
  cuentaData,
  isLoadingCuenta
}) {
  // ✅ SI HAY CLIENTE SELECCIONADO Y NO BUSQUEDA → SOLO ESE
  const cuentasFiltradas = cuentas.filter(cuenta => {
    const query = busquedaCuenta.toLowerCase();
    
    // ✅ Cliente seleccionado + sin búsqueda → SOLO ESE
    if (cuentaSeleccionada && !busquedaCuenta.trim()) {
      return cuenta.id === cuentaSeleccionada.id;
    }
    
    // ✅ Con búsqueda → filtrados normales
    const saldoStr = String(cuenta.saldo ?? 0);
    return (
      cuenta.nombre?.toLowerCase().includes(query) ||
      cuenta.descripcion?.toLowerCase().includes(query) ||
      saldoStr.includes(query)
    );
  }).sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));

  const handleSeleccionCuenta = (cuenta) => {
    setCuentaSeleccionada(cuenta);
    setBusquedaCuenta('');
  };

  const handleLimpiarSeleccion = () => {
    setCuentaSeleccionada(null);
    setBusquedaCuenta('');
  };

  return (
    <div className="card border-start border-warning border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <h6 className="mb-3 fw-bold text-warning">
          <i className="bi bi-people-fill me-2"/>Seleccionar Cliente
        </h6>
        
        <input
          type="text"
          className="form-control form-control-sm mb-2"
          placeholder="Buscar por nombre o deuda..."
          value={busquedaCuenta}
          onChange={(e) => setBusquedaCuenta(e.target.value)}
        />

        {/* ✅ BOTÓN CAMBIAR si hay selección */}
        {cuentaSeleccionada && (
          <button
            className="btn btn-outline-secondary btn-sm w-100 mb-2"
            onClick={handleLimpiarSeleccion}
          >
            <i className="bi bi-x-circle me-1"/>Cambiar cliente
          </button>
        )}

        {/* ✅ TABLA - SOLO SI NO HAY SELECCIÓN O HAY BUSQUEDA */}
        {(!cuentaSeleccionada || busquedaCuenta.trim()) && (
          <div className="table-responsive" style={{ maxHeight: '200px', overflow: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Cliente</th>
                  <th className="text-end">Deuda</th>
                </tr>
              </thead>
              <tbody>
                {cuentasFiltradas.slice(0, 15).map((cuenta) => (
                  <tr
                    key={cuenta.id}
                    className={cuentaSeleccionada?.id === cuenta.id ? 'table-warning' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSeleccionCuenta(cuenta)}
                  >
                    <td className="pe-3">
                      <div className="fw-semibold">{cuenta.nombre}</div>
                      <small className="text-muted">{cuenta.descripcion}</small>
                    </td>
                    <td className="text-end">
                      <div className={`fw-bold fs-6 ${
                        (cuenta.saldo ?? 0) > 0 ? 'text-danger' : 'text-success'
                      }`}>
                        {formatMoney(cuenta.saldo ?? 0)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ SI NO HAY RESULTADOS */}
        {cuentasFiltradas.length === 0 && busquedaCuenta && (
          <div className="text-center py-3">
            <small className="text-muted">No se encontraron clientes</small>
          </div>
        )}

        {/* ✅ CLIENTE SELECCIONADO - MUESTRA UNA SOLA VEZ */}
        {cuentaSeleccionada && !busquedaCuenta.trim() && (
          <div className="mt-3 p-3 bg-warning bg-opacity-10 border rounded shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="fw-bold fs-5">{cuentaSeleccionada.nombre}</div>
              <span className="badge bg-danger fs-6 px-3 py-2 fw-bold shadow-sm">
                {formatMoney(cuentaSeleccionada.saldo ?? 0)}
              </span>
            </div>
            <div className="row text-center small">
              <div className="col-4">
                <div className="fw-semibold text-success">
                  {formatMoney(cuentaSeleccionada.totalFacturado ?? 0)}
                </div>
                <div className="text-muted">Vendido</div>
              </div>
              <div className="col-4">
                <div className="fw-semibold text-primary">
                  {formatMoney(cuentaSeleccionada.totalPagado ?? 0)}
                </div>
                <div className="text-muted">Pagado</div>
              </div>
              <div className="col-4">
                <i className="bi bi-check-circle-fill text-success fs-1 opacity-75"/>
                <div className="text-muted small mt-1">Seleccionado</div>
              </div>
            </div>
            
            {/* Detalles adicionales */}
            {isLoadingCuenta ? (
              <div className="small text-muted mt-2 text-center">
                <div className="spinner-border spinner-border-sm me-2"/>
                Cargando detalles...
              </div>
            ) : cuentaData ? (
              <div className="small mt-2 p-2  rounded">
                <div className="text-muted">Ventas: <strong>{cuentaData.totalVentas}</strong></div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
