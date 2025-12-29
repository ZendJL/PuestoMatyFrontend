export default function ResumenVenta({
  carrito,
  total,
  pagoCliente,
  cambio,
  modoPrestamo,
  formatMoney,
}) {
  return (
    <div className="card border-start border-success border-4 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-receipt me-2 text-success"/>Resumen Venta
          </h6>
        </div>
        
        <div className="row g-2 mb-3">
          <div className="col-6">
            <div className="d-flex justify-content-between">
              <span className="text-muted">Artículos</span>
              <span className="fw-bold">{carrito.length}</span>
            </div>
          </div>
          <div className="col-6">
            <div className="d-flex justify-content-between">
              <span className="text-muted">Subtotal</span>
              <span className="fw-bold fs-5">{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        {!modoPrestamo && (
          <>
            <hr className="my-2"/>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold text-primary">Pago recibido</span>
                  <span className="fw-bold">{formatMoney(Number(pagoCliente) || 0)}</span>
                </div>
              </div>
              <div className="col-6">
                <div className="d-flex justify-content-between">
                  <span className="fw-bold text-success">Cambio</span>
                  <span className="fs-4 fw-bold text-success">{formatMoney(cambio)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`p-3 rounded ${modoPrestamo ? 'bg-warning-subtle' : 'bg-success-subtle'}`}>
          <div className="d-flex justify-content-between align-items-center">
            <span className={`fw-bold ${modoPrestamo ? 'text-warning' : 'text-success'}`}>
              {modoPrestamo ? 'TOTAL POR COBRAR' : 'TOTAL A PAGAR'}
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
