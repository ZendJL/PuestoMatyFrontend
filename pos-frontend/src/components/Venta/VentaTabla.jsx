export default function VentaTabla({
  carrito,
  formatMoney,
  cambiarCantidad,
  quitarDelCarrito,
  pageSize,
  setPageSize,
}) {
  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header d-flex justify-content-between align-items-center bg-body-tertiary border-bottom">
        <h6 className="mb-0 fw-semibold">
          🛒 Carrito <span className="badge bg-primary">{carrito.length}</span>
        </h6>
        <select
          className="form-select form-select-sm"
          style={{ width: '90px' }}
          value={pageSize}
          onChange={(e) => setPageSize(parseInt(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
      <div className="card-body p-0" style={{ maxHeight: '400px', overflow: 'auto' }}>
        <div className="table-responsive">
          <table className="table table-hover table-sm mb-0">
            <thead className="table-light sticky-top bg-body-tertiary">
              <tr>
                <th style={{ width: '42%' }}>Producto</th>
                <th className="text-end" style={{ width: '13%' }}>Precio</th>
                <th className="text-center" style={{ width: '12%' }}>Cant.</th>
                <th className="text-end" style={{ width: '13%' }}>Subtotal</th>
                <th className="text-center" style={{ width: '20%' }}><small>Eliminar</small></th>
              </tr>
            </thead>
            <tbody className="table-group-divider">
              {carrito.slice(0, pageSize).map((item) => {
                const rawVal = item.cantidadRaw !== undefined ? item.cantidadRaw : String(item.cantidad);
                const excede = item.cantidad >= (item.stock ?? 0);
                return (
                  <tr key={item.id} className="align-middle">
                    <td>
                      <div className="fw-semibold">{item.descripcion}</div>
                      <small className="text-body-secondary">#{item.codigo}</small>
                    </td>
                    <td className="text-end fw-medium">{formatMoney(item.precio)}</td>
                    <td className="text-center">
                      <input
                        type="number"
                        min="0"
                        max={item.stock}
                        value={rawVal}
                        onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === '0') {
                            cambiarCantidad(item.id, '1');
                          }
                        }}
                        className={`form-control form-control-sm text-center w-75 mx-auto${
                          excede ? ' border-warning' : ''
                        }`}
                      />
                      {excede && (
                        <div className="text-warning" style={{ fontSize: '0.65rem', lineHeight: 1 }}>
                          máx {item.stock}
                        </div>
                      )}
                    </td>
                    <td className="text-end fw-semibold text-success">
                      {formatMoney(item.precio * item.cantidad)}
                    </td>
                    <td className="text-center p-1">
                      <button
                        type="button"
                        className="btn btn-danger rounded-circle fw-bold shadow-sm"
                        style={{ width: '42px', height: '42px', fontSize: '1.4rem', lineHeight: 1 }}
                        onClick={() => quitarDelCarrito(item.id)}
                        title="Eliminar producto"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              {carrito.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-body-secondary py-5">
                    <i className="bi bi-cart-x fs-1 mb-3 d-block opacity-50" />
                    <div className="fs-5 fw-semibold mb-2">Carrito vacío</div>
                    <small className="opacity-75">Busca o escanea un producto</small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
