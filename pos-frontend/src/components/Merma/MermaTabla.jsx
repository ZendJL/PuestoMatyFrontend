export default function MermaTabla({
  itemsMerma,
  cambiarCantidadItem,
  quitarItem,
  pageSize,
  setPageSize,
  formatMoney,
}) {
  const items = Array.isArray(itemsMerma) ? itemsMerma : [];

  return (
    <div className="card shadow-sm mb-3">
      <div className="card-header d-flex justify-content-between align-items-center bg-body-tertiary border-bottom">
        <h6 className="mb-0 fw-semibold">
          📋 Items <span className="badge bg-danger">{items.length}</span>
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
                <th style={{ width: '45%' }}>Producto</th>
                <th className="text-center" style={{ width: '15%' }}>Cant.</th>
                <th className="text-center" style={{ width: '15%' }}>Stock</th>
                <th style={{ width: '15%' }} className="text-center"><small>Eliminar</small></th>
              </tr>
            </thead>
            <tbody className="table-group-divider">
              {items.slice(0, pageSize).map((item) => {
                if (!item) return null;
                const rawVal = item.cantidadRaw !== undefined ? item.cantidadRaw : String(item.cantidad);
                const excede = (item.cantidad || 0) >= (item.inventario ?? 0);
                return (
                  <tr key={item.id} className="align-middle">
                    <td>
                      <div className="fw-semibold">{item.descripcion || 'Sin nombre'}</div>
                      <small className="text-body-secondary">#{item.codigo || 'N/A'}</small>
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
                        className={`form-control form-control-sm text-center w-75 mx-auto ${
                          excede ? 'border-warning' : ''
                        }`}
                      />
                      {excede && (
                        <div className="text-warning" style={{ fontSize: '0.65rem', lineHeight: 1 }}>
                          máx {item.inventario}
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="badge bg-secondary">{item.inventario ?? 0}</span>
                    </td>
                    <td className="p-0">
                      <div className="d-flex justify-content-center align-items-center h-100">
                        <span
                          className="rounded-circle shadow-sm"
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#dc3545',
                            color: '#ffffff',
                            fontSize: '1.4rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => quitarItem(item.id)}
                          title="Eliminar"
                        >
                          ×
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-body-secondary py-5">
                    <i className="bi bi-inbox fs-1 mb-3 d-block opacity-50" />
                    <div className="fs-5 fw-semibold mb-2">Lista vacía</div>
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
