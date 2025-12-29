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
          style={{width: '90px'}} 
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
                <th style={{width: '42%'}}>Producto</th>
                <th className="text-end" style={{width: '13%'}}>Precio</th>
                <th className="text-center" style={{width: '12%'}}>Cant.</th>
                <th className="text-end" style={{width: '13%'}}>Subtotal</th>
                <th style={{width: '20%'}} className="text-center">
                  <small>Eliminar</small>
                </th>
              </tr>
            </thead>
            <tbody className="table-group-divider">
              {carrito.slice(0, pageSize).map((item) => (
                <tr key={item.id} className="align-middle">
                  <td>
                    <div className="fw-semibold">{item.descripcion}</div>
                    <small className="text-body-secondary">#{item.codigo}</small>
                  </td>
                  <td className="text-end fw-medium">{formatMoney(item.precio)}</td>
                  <td className="text-center">
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                      className="form-control form-control-sm text-center w-75 mx-auto"
                    />
                  </td>
                  <td className="text-end fw-semibold text-success">
                    {formatMoney(item.precio * item.cantidad)}
                  </td>
                  <td className="p-0">
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <span
                        className="rounded-circle shadow-sm delete-btn"
                        style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: '#dc3545',
                          color: '#ffffff',
                          fontSize: '1.6rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          border: '3px solid #ffffff',
                          boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => quitarDelCarrito(item.id)}
                        title="Eliminar producto"
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.1)';
                          e.target.style.boxShadow = '0 6px 16px rgba(220, 53, 69, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)';
                        }}
                      >
                        ×
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {carrito.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-body-secondary py-5">
                    <i className="bi bi-cart-x fs-1 mb-3 d-block opacity-50"/>
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
