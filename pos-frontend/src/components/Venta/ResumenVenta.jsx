export default function ResumenVenta({
  carrito,
  total,
  pagoCliente,
  cambio,
  modoPrestamo,
  formatMoney,
}) {
  return (
    <div className="border rounded p-3 bg-body">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold">Artículos</span>
        <span className="fs-6 fw-semibold">{carrito.length}</span>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-semibold">Subtotal</span>
        <span className="fs-6 fw-semibold">
          {formatMoney(total)}
        </span>
      </div>
      {!modoPrestamo && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold">Pago</span>
            <span className="fs-6 fw-semibold">
              {formatMoney(Number(pagoCliente) || 0)}
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Cambio</span>
            <span className="fs-5 fw-bold text-success">
              {formatMoney(cambio)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
