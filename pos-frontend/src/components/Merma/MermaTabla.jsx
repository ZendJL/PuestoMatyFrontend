export default function MermaTabla({
  itemsMerma,
  cambiarCantidadItem,
  quitarItem,
  pageSize,
  setPageSize,
  formatMoney,
}) {
  const items = Array.isArray(itemsMerma) ? itemsMerma : [];
  const totalCosto = items.reduce((sum, i) => {
    const precio = i?.precioVenta || i?.precio || 0;
    return sum + precio * (i?.cantidad || 0);
  }, 0);

  return (
    <div className="card shadow-sm mb-3 border-0">
      <div className="card-header bg-body-tertiary border-bottom d-flex justify-content-between align-items-center py-2">
        <h6 className="mb-0 fw-semibold">
          <i className="bi bi-list-ul text-danger me-2" />
          Productos en lista
          <span className="badge bg-danger ms-2">{items.length}</span>
        </h6>
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">Mostrar:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: '80px' }}
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="card-body p-0" style={{ maxHeight: '420px', overflow: 'auto' }}>
        <table className="table table-hover table-sm mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ minWidth: '160px' }}>Producto</th>
              <th className="text-center" style={{ width: '100px' }}>Cantidad</th>
              <th className="text-center" style={{ width: '80px' }}>Stock</th>
              <th className="text-end" style={{ width: '90px' }}>Precio</th>
              <th className="text-center" style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, pageSize).map((item) => {
              if (!item) return null;
              const rawVal = item.cantidadRaw !== undefined ? item.cantidadRaw : String(item.cantidad);
              const excede = (item.cantidad || 0) >= (item.inventario ?? 0);
              const precioUnitario = item?.precioVenta || item?.precio || 0;
              return (
                <tr key={item.id} className="align-middle">
                  <td>
                    <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                      {item.descripcion || 'Sin nombre'}
                    </div>
                    <small className="text-muted">#{item.codigo || 'N/A'}</small>
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      min="0"
                      max={item.inventario}
                      value={rawVal}
                      onChange={(e) => cambiarCantidadItem(item.id, e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === '' || e.target.value === '0') {
                          cambiarCantidadItem(item.id, '1');
                        }
                      }}
                      className={`form-control form-control-sm text-center ${
                        excede ? 'border-warning' : ''
                      }`}
                      style={{ width: '70px', margin: '0 auto' }}
                    />
                    {excede && (
                      <div className="text-warning" style={{ fontSize: '0.65rem' }}>
                        máx {item.inventario}
                      </div>
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${
                      (item.inventario ?? 0) > 10 ? 'bg-success' :
                      (item.inventario ?? 0) > 0 ? 'bg-warning text-dark' : 'bg-danger'
                    }`}>
                      {item.inventario ?? 0}
                    </span>
                  </td>
                  <td className="text-end">
                    <div className="fw-bold" style={{ fontSize: '0.85rem' }}>
                      {precioUnitario > 0 ? formatMoney(precioUnitario) : <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="text-center p-1">
                    <button
                      className="btn btn-sm btn-outline-danger rounded-circle p-0"
                      style={{ width: '32px', height: '32px', lineHeight: '30px' }}
                      onClick={() => quitarItem(item.id)}
                      title="Quitar"
                    >
                      <i className="bi bi-x-lg" style={{ fontSize: '0.85rem' }} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-5">
                  <i className="bi bi-inbox fs-1 d-block mb-2 opacity-40" />
                  <div className="fw-semibold">Lista vacía</div>
                  <small>Busca o escanea un producto para agregarlo</small>
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 1 && (
            <tfoot className="table-light">
              <tr>
                <td colSpan={3} className="text-muted small">* Precio de venta como referencia</td>
                <td className="text-end fw-bold">{formatMoney(totalCosto)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
