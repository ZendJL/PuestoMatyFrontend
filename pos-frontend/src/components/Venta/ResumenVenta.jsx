export default function ResumenVenta({ carrito, total, pagoTotalMXN, cambio, modoPrestamo, modoPago, formatMoney }) {
  const esTarjeta = modoPago === 'TARJETA';

  return (
    <div className="card border-start border-success border-4 shadow-sm mb-3">
      <div className="card-body p-3">
        <h6 className="mb-3">
          <i className="bi bi-receipt me-2 text-success" />Resumen Venta
        </h6>

        <div className="d-flex justify-content-between mb-2">
          <span className="text-muted">Artículos</span>
          <span className="fw-bold">{carrito.length}</span>
        </div>

        {!modoPrestamo && !esTarjeta && pagoTotalMXN > 0 && (
          <>
            <hr className="my-2" />
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Pago recibido</span>
              <span className="fw-bold">{formatMoney(pagoTotalMXN)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="fw-semibold text-success">Cambio</span>
              <span className="fs-5 fw-bold text-success">{formatMoney(cambio)}</span>
            </div>
          </>
        )}

        <div className={`p-3 rounded mt-3 ${modoPrestamo ? 'bg-warning-subtle' : 'bg-success-subtle'}`}>
          <div className="d-flex justify-content-between align-items-center">
            <span className={`fw-bold ${modoPrestamo ? 'text-warning' : 'text-success'}`}>
              {modoPrestamo ? 'FIADO' : esTarjeta ? '💳 TARJETA' : 'TOTAL'}
            </span>
            <span className={`fs-3 fw-bold ${modoPrestamo ? 'text-warning' : 'text-success'}`}>
              {formatMoney(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
