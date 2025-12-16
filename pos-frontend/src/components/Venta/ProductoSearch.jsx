export default function ProductoSearch({
  busqueda,
  setBusqueda,
  productosFiltrados,
  manejarSeleccionProducto,
  manejarSeleccionPorEnter,
}) {
  return (
    <>
      <div className="mb-2">
        <label className="form-label mb-1 fw-semibold">Producto</label>
        <input
          className="form-control form-control-sm"
          placeholder="Escanea código o escribe nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' && manejarSeleccionPorEnter()
          }
          autoFocus
        />
      </div>

      {busqueda && productosFiltrados.length > 0 && (
        <div
          className="mb-3 border rounded small"
          style={{ maxHeight: 160, overflowY: 'auto' }}
        >
          <table className="table table-hover table-sm mb-0">
            <tbody>
              {productosFiltrados.map((p) => (
                <tr
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => manejarSeleccionProducto(p)}
                >
                  <td
                    className="text-truncate"
                    style={{ maxWidth: 260 }}
                  >
                    <div className="fw-semibold">{p.descripcion}</div>
                    <div className="text-body-secondary small">
                      Código: {p.codigo}
                    </div>
                  </td>
                  <td className="text-end align-middle">
                    <div className="fw-semibold text-success">
                      {p.precio != null ? p.precio.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-body-secondary small">
                      Stock: {p.cantidad}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
