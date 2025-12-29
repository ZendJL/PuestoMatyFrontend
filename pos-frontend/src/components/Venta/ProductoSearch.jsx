export default function ProductoSearch({
  busqueda,
  setBusqueda,
  productosFiltrados,
  manejarSeleccionProducto,
  manejarSeleccionPorEnter,
  formatMoney, // ✅ AGREGAR ESTA PROP
}) {
  return (
    <div className="card border-start border-success border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-search me-2 text-success"/>Buscar Producto
          </h6>
        </div>
        
        <div className="mb-3">
          <input
            className="form-control form-control-lg"
            placeholder="🔍 Escanea código o escribe nombre... (Enter)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manejarSeleccionPorEnter()}
            autoFocus
          />
        </div>

        {busqueda && productosFiltrados.length > 0 && (
          <div className="table-responsive" style={{ maxHeight: '200px', overflow: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => manejarSeleccionProducto(p)}
                  >
                    <td className="text-truncate" style={{ maxWidth: '220px' }}>
                      <div className="fw-semibold">{p.descripcion}</div>
                      <small className="text-muted">#{p.codigo}</small>
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-success">
                        {formatMoney(p.precio ?? 0)} {/* ✅ Ahora usa la prop */}
                      </div>
                      <small className="text-muted">Stock: {p.cantidad}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
