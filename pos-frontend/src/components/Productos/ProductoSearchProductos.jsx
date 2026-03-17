export default function ProductoSearchProductos({
  codigoEscaneado = '',
  busquedaProducto = '',
  setBusquedaProducto,
  productosFiltrados = [],
  productoSeleccionado,
  seleccionarProducto,
  inputBusquedaRef,
}) {
  // Este componente ya no se usa directamente en el nuevo diseño con tabs,
  // toda la UI de búsqueda quedó integrada en Productos.jsx tab "Buscar".
  // Se mantiene para compatibilidad con otras partes del sistema que lo importen.
  return (
    <div>
      <input
        ref={inputBusquedaRef}
        type="text"
        className="form-control"
        placeholder="Buscar producto..."
        value={busquedaProducto}
        onChange={(e) => setBusquedaProducto?.(e.target.value)}
      />
      {codigoEscaneado.length > 0 && (
        <div className="alert alert-info py-1 mt-1 small">
          Escaneando: <strong>{codigoEscaneado}</strong>
        </div>
      )}
      {productosFiltrados.length > 0 && (
        <ul className="list-group mt-1">
          {productosFiltrados.map(p => (
            <li
              key={p.id}
              className={`list-group-item list-group-item-action py-1 px-2 small ${productoSeleccionado?.id === p.id ? 'active' : ''}`}
              onClick={() => seleccionarProducto?.(p)}
              style={{ cursor: 'pointer' }}
            >
              <span className="fw-semibold">{p.descripcion}</span>
              <span className="ms-2 text-muted">#{p.codigo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
