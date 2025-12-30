import { formatMoney } from '../../utils/format';

export default function ProductoSearchProductos({
  productosFiltrados,
  busquedaProducto,
  setBusquedaProducto,
  onKeyDown,  // ✅ HANDLER DE ENTER
  productoSeleccionado,
  setProductoSeleccionado,
  setDescripcionEdit,
  setPrecioEdit,
  setPrecioCompraEdit,
  setActivoEdit,
  setCodigoEdit,
  setPrecioCompraAgregar,
  setForm  // ✅ PARA AUTO-LLENAR CÓDIGO
}) {
  return (
    <div className="card border-start border-info border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-search me-2 text-info"/>Buscar Producto
          </h6>
        </div>
        
        <input
          type="text"
          className="form-control form-control-lg mb-3"
          placeholder="🔍 Escribe código o descripción... (⏎=Enter para buscar)"
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
          onKeyDown={onKeyDown}  // ✅ ENTER FUNCIONA
        />

        {busquedaProducto && productosFiltrados.length > 0 && (
          <div className="table-responsive" style={{ maxHeight: '250px', overflow: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Producto</th>
                  <th className="text-end">Precio</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className={productoSeleccionado?.id === p.id ? 'table-primary' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setProductoSeleccionado(p);
                      setBusquedaProducto(p.descripcion);
                      setDescripcionEdit(p.descripcion || '');
                      setPrecioEdit(p.precio != null ? String(p.precio) : '');
                      setPrecioCompraEdit(p.precioCompra != null ? String(p.precioCompra) : '');
                      setActivoEdit(p.activo == null ? true : p.activo);
                      setCodigoEdit(p.codigo || '');
                      setPrecioCompraAgregar(p.precioCompra != null ? String(p.precioCompra) : '');
                    }}
                  >
                    <td className="text-truncate pe-3" style={{ maxWidth: '220px' }}>
                      <div className="fw-bold ">{p.descripcion}</div>
                      <small className="">#{p.codigo}</small>
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-success">{formatMoney(p.precio ?? 0)}</div>
                      <div className="small">
                        {p.cantidad} und | 
                        <span className={`ms-1 badge fs-6 px-2 py-1 fw-semibold ${
                          p.activo === false ? 'bg-danger text-white' : 'bg-success text-white'
                        }`}>
                          {p.activo === false ? 'Inactivo' : 'Activo'}
                        </span>
                      </div>
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
