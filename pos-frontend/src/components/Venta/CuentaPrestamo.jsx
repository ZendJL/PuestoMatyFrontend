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
  // ✅ FILTRAR EN FRONTEND (rápido)
  const cuentasFiltradas = cuentas.filter(cuenta => {
    const query = busquedaCuenta.toLowerCase();
    const saldoStr = String(cuenta.saldo ?? 0);
    return (
      cuenta.nombre?.toLowerCase().includes(query) ||
      cuenta.descripcion?.toLowerCase().includes(query) ||
      saldoStr.includes(query)
    );
  }).sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0)); // ✅ Ordenar por deuda ↓

  const handleSeleccionCuenta = (cuenta) => {
    setCuentaSeleccionada(cuenta);
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

        <div className="table-responsive" style={{ maxHeight: '250px', overflow: 'auto' }}>
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light sticky-top">
              <tr>
                <th>Cliente</th>
                <th className="text-end">Deuda</th>
              </tr>
            </thead>
            <tbody>
              {cuentasFiltradas.slice(0, 15).map((cuenta) => ( // ✅ Limitar 15
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
                      (cuenta.saldo ?? 0) > 0 
                        ? 'text-danger' 
                        : 'text-success'
                    }`}>
                      {formatMoney(cuenta.saldo ?? 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {cuentasFiltradas.length === 0 && busquedaCuenta && (
          <div className="text-center py-2">
            <small className="text-muted">No se encontraron clientes</small>
          </div>
        )}

        {/* ✅ RESUMEN OPTIMIZADO */}
        {cuentaSeleccionada && (
          <div className="mt-3 p-2 bg-light border rounded">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold">{cuentaSeleccionada.nombre}</span>
              <span className={`badge fs-6 px-2 py-1 ${
                (cuentaSeleccionada.saldo ?? 0) > 0 ? 'bg-danger' : 'bg-success'
              }`}>
                {formatMoney(cuentaSeleccionada.saldo ?? 0)}
              </span>
            </div>
            {isLoadingCuenta ? (
              <div className="small text-muted mt-1">Cargando detalles...</div>
            ) : cuentaData ? (
              <div className="small mt-1">
                <div>Ventas: {cuentaData.totalVentas}</div>
                <div>Total ventas: {formatMoney(cuentaData.totalVentasMonto)}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
