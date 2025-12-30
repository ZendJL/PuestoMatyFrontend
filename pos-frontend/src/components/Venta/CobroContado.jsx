export default function CobroContado({
  pagoCliente,
  setPagoCliente,
  cambio,
  formatMoney,
  DENOMINACIONES,
  aplicarDenominacion,
}) {
  return (
    <div className="card border-start border-primary border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-cash-stack me-2 text-primary"/>Cobro
          </h6>
        </div>
        
        <div className="mb-3">
          <label className="form-label fw-semibold mb-2">Pago del cliente</label>
          <div className="input-group">
            <span className="input-group-text bg-primary text-white">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-lg"
              value={pagoCliente}
              onChange={(e) => setPagoCliente(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold mb-2 small">Denominaciones rápidas</label>
          <div className="d-flex flex-wrap gap-1">
            {DENOMINACIONES.map((monto) => (
              <button
                key={monto}
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => aplicarDenominacion(monto)}
              >
                {formatMoney(monto)}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center p-2  rounded">
          <span className="fw-bold text-primary">Cambio:</span>
          <span className="fs-4 fw-bold text-success">
            {formatMoney(cambio)}
          </span>
        </div>
      </div>
    </div>
  );
}
