export default function VentaTabla({
  carrito,
  formatMoney,
  cambiarCantidad,
  quitarDelCarrito,
  pageSize,
}) {
  return (
    <div className="card shadow-sm" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header d-flex justify-content-between align-items-center bg-body-tertiary py-2">
        <span className="fw-bold" style={{ fontSize: '1rem' }}>
          🛒 Carrito
          <span className="badge bg-primary ms-2">{carrito.length}</span>
        </span>
        {carrito.length > 0 && (
          <span className="text-muted" style={{ fontSize: '0.8rem' }}>
            {carrito.reduce((s, i) => s + i.cantidad, 0)} unidades
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table className="table table-hover mb-0" style={{ fontSize: '1rem' }}>
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: '38%' }} className="py-2">Producto</th>
              <th className="text-end py-2" style={{ width: '14%' }}>Precio</th>
              <th className="text-center py-2" style={{ width: '14%' }}>Cant.</th>
              <th className="text-center py-2" style={{ width: '10%' }}>Stock</th>
              <th className="text-end py-2" style={{ width: '14%' }}>Subtotal</th>
              <th className="text-center py-2" style={{ width: '10%' }}>—</th>
            </tr>
          </thead>
          <tbody>
            {carrito.slice(0, pageSize).map((item) => {
              const rawVal = item.cantidadRaw !== undefined ? item.cantidadRaw : String(item.cantidad);
              const stock = item.stock ?? 0;
              // Solo aviso visual si se vende más del stock registrado, pero no bloquea
              const sinStock = stock <= 0;
              const excedeStock = item.cantidad > stock;
              return (
                <tr key={item.id} className="align-middle" style={{ height: '52px' }}>
                  <td>
                    <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>{item.descripcion}</div>
                    <small className="text-muted">#{item.codigo}</small>
                  </td>
                  <td className="text-end fw-medium">{formatMoney(item.precio)}</td>
                  <td className="text-center">
                    <input
                      type="number"
                      min="1"
                      value={rawVal}
                      onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                      onBlur={(e) => { if (e.target.value === '' || e.target.value === '0') cambiarCantidad(item.id, '1'); }}
                      className={`form-control form-control-sm text-center mx-auto${excedeStock ? ' border-warning' : ''}`}
                      style={{ width: '60px' }}
                    />
                  </td>
                  <td className="text-center">
                    {sinStock ? (
                      <span className="badge bg-warning text-dark" title="Sin stock registrado — puede haber producto físico">
                        ⚠️ {stock}
                      </span>
                    ) : excedeStock ? (
                      <span className="badge bg-warning text-dark" title="Vendiendo más del stock registrado">
                        ⚠️ {stock}
                      </span>
                    ) : (
                      <span className="fw-semibold text-success">{stock}</span>
                    )}
                  </td>
                  <td className="text-end fw-semibold text-success">{formatMoney(item.precio * item.cantidad)}</td>
                  <td className="text-center p-1">
                    <button
                      type="button"
                      className="btn btn-danger rounded-circle fw-bold"
                      style={{ width: '38px', height: '38px', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}
                      onClick={() => quitarDelCarrito(item.id)}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
            {carrito.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted py-5">
                  <i className="bi bi-cart-x fs-1 d-block mb-2 opacity-50" />
                  <div className="fs-5 fw-semibold">Carrito vacío</div>
                  <small>Busca o escanea un producto</small>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
