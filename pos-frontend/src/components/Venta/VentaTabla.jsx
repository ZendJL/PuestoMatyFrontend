export default function CarritoTabla({
  carrito,
  formatMoney,
  cambiarCantidad,
  quitarDelCarrito,
}) {
  return (
    <div
      className="border rounded small"
      style={{ maxHeight: 260, overflowY: 'auto' }}
    >
      <table className="table table-hover table-sm mb-0">
        <thead className="sticky-top">
          <tr>
            <th>Producto</th>
            <th className="text-end">Precio</th>
            <th className="text-center" style={{ width: 90 }}>
              Cant.
            </th>
            <th className="text-end">Subtotal</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {carrito.map((item) => (
            <tr key={item.id}>
              <td className="text-truncate" style={{ maxWidth: 220 }}>
                {item.descripcion}
                <div className="small text-body-secondary">
                  Código: {item.codigo} · Stock: {item.stock}
                </div>
              </td>
              <td className="text-end">
                {formatMoney(item.precio)}
              </td>
              <td className="text-center">
                <input
                  type="number"
                  min="1"
                  value={item.cantidad}
                  onChange={(e) =>
                    cambiarCantidad(item.id, e.target.value)
                  }
                  className="form-control form-control-sm text-center"
                />
              </td>
              <td className="text-end fw-semibold text-success">
                {formatMoney(item.precio * item.cantidad)}
              </td>
              <td className="text-end">
                <button
                  onClick={() => quitarDelCarrito(item.id)}
                  className="btn btn-sm btn-outline-danger"
                  title="Quitar"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          {carrito.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="text-center text-body-secondary py-3"
              >
                Carrito vacío. Escanea o busca un producto para comenzar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
