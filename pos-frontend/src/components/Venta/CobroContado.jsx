export default function CobroContado({
  pagoCliente,
  setPagoCliente,
  cambio,
  formatMoney,
  DENOMINACIONES,
  aplicarDenominacion,
}) {
  return (
    <div className="mb-3 border rounded p-2 bg-body-tertiary">
      <div className="fw-semibold mb-1">Cobro</div>
      <div className="mb-2">
        <label className="form-label mb-1 small">
          Pago del cliente
        </label>
        <div className="input-group input-group-sm mb-2">
          <span className="input-group-text">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="form-control"
            value={pagoCliente}
            onChange={(e) => setPagoCliente(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="d-flex flex-wrap gap-1">
          {DENOMINACIONES.map((monto) => (
            <button
              key={monto}
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => aplicarDenominacion(monto)}
            >
              {formatMoney(monto)}
            </button>
          ))}
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-1">
        <span className="fw-semibold">Cambio</span>
        <span className="fs-5 fw-bold text-success">
          {formatMoney(cambio)}
        </span>
      </div>
    </div>
  );
}
