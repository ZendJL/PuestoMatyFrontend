import axios from 'axios';
import { formatMoney } from '../../utils/format';
import { imprimirCodigoBarras } from '../../utils/PrintBarcode'; // ⭐ IMPORTAR

export default function ProductosPanel({
  productoSeleccionado,
  cantidadAgregar,
  setCantidadAgregar,
  precioCompraAgregar,
  setPrecioCompraAgregar,
  descripcionEdit,
  setDescripcionEdit,
  precioEdit,
  setPrecioEdit,
  precioCompraEdit,
  setPrecioCompraEdit,
  activoEdit,
  setActivoEdit,
  codigoEdit,
  setCodigoEdit,
  limpiarSeleccion,
  queryClient
}) {
  const agregarStock = async () => {
    if (!productoSeleccionado) return;

    const cant = Number(cantidadAgregar);
    if (Number.isNaN(cant) || cant <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    const costoStr = precioCompraAgregar.trim();
    const precioCompra = Number(
      costoStr === '' ? productoSeleccionado.precioCompra : costoStr
    );
    
    if (Number.isNaN(precioCompra) || precioCompra < 0) {
      alert('El costo de compra debe ser un número válido');
      return;
    }

    try {
      const res = await axios.post(
        `/api/productos/${productoSeleccionado.id}/agregar-stock`,
        null,
        { params: { cantidad: cant, precioCompra } }
      );
      alert(`✅ Se agregaron ${cant} unidades. Nuevo inventario: ${res.data.cantidad}`);
      
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
      
      setCantidadAgregar('');
      setPrecioCompraAgregar(String(precioCompra));
    } catch (err) {
      console.error(err);
      alert('❌ Error al agregar inventario');
    }
  };

  const guardarCambiosProducto = async () => {
    if (!productoSeleccionado) return;

    const nuevaDescripcion = descripcionEdit.trim() || productoSeleccionado.descripcion;
    const nuevoPrecio = precioEdit === '' ? productoSeleccionado.precio : Number(precioEdit);
    const nuevoPrecioCompra = precioCompraEdit === ''
      ? productoSeleccionado.precioCompra
      : Number(precioCompraEdit);

    if (!nuevaDescripcion) {
      alert('La descripción no puede estar vacía');
      return;
    }
    if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      alert('El precio debe ser válido');
      return;
    }

    try {
      const body = {
        ...productoSeleccionado,
        codigo: codigoEdit.trim() || productoSeleccionado.codigo,
        descripcion: nuevaDescripcion,
        precio: nuevoPrecio,
        precioCompra: nuevoPrecioCompra,
        activo: activoEdit,
      };

      await axios.put(`/api/productos/${productoSeleccionado.id}`, body);
      alert('✅ Producto actualizado correctamente');
      
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
      
      limpiarSeleccion();
    } catch (err) {
      console.error(err);
      alert('❌ Error al actualizar producto');
    }
  };

  // ⭐ FUNCIÓN PARA REIMPRIMIR CÓDIGO DE BARRAS
  const handleReimprimirCodigo = async () => {
    if (!productoSeleccionado) return;
    
    const exito = await imprimirCodigoBarras({
      codigo: productoSeleccionado.codigo,
      descripcion: productoSeleccionado.descripcion
    });
    
    if (exito) {
      alert('🖨️ Código de barras enviado a impresora');
    }
  };

  if (!productoSeleccionado) {
    return (
      <div className="card shadow-sm h-100">
        <div className="card-body text-center py-5">
          <i className="bi bi-box-seam fs-1 mb-3 d-block text-muted"/>
          <div className="h5 fw-bold mb-2 text-muted">Selecciona un producto</div>
          <small className="text-muted">para agregar inventario o editar</small>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm h-100">
      <div className="card-header bg-primary text-white py-2">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold">
            <i className="bi bi-box-seam me-2"/> {productoSeleccionado.descripcion}
          </h6>
          <div className="d-flex gap-2">
            {/* ⭐ BOTÓN REIMPRIMIR CÓDIGO */}
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={handleReimprimirCodigo}
              title="Reimprimir código de barras"
            >
              <i className="bi bi-printer-fill me-1"/>Reimprimir
            </button>
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={limpiarSeleccion}
            >
              <i className="bi bi-x"/>Limpiar
            </button>
          </div>
        </div>
      </div>
      
      <div className="card-body p-3">
        <div className="card border-start border-warning border-3 shadow-sm mb-3">
          <div className="card-body p-3">
            <h6 className="mb-3 fw-bold text-warning">
              <i className="bi bi-plus-circle-fill me-2"/>Agregar Inventario
            </h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-2">Cantidad</label>
                <input
                  type="number"
                  className="form-control form-control-lg"
                  min="1"
                  value={cantidadAgregar}
                  onChange={(e) => setCantidadAgregar(e.target.value)}
                  placeholder="Ej: 12"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-2">Costo compra</label>
                <div className="input-group">
                  <span className="input-group-text fs-5">$</span>
                  <input
                    type="number"
                    className="form-control form-control-lg"
                    step="0.01"
                    min="0"
                    value={precioCompraAgregar}
                    onChange={(e) => setPrecioCompraAgregar(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <button 
              className="btn btn-warning w-100 mt-3 py-2 fw-bold fs-6"
              onClick={agregarStock}
            >
              <i className="bi bi-plus-circle-fill me-2"/> Agregar Inventario
            </button>
          </div>
        </div>

        <div className="card border-start border-primary border-3 shadow-sm">
          <div className="card-body p-3">
            <h6 className="mb-3 fw-bold text-primary">
              <i className="bi bi-pencil-fill me-2"/>Editar Datos
            </h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-2">Código</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={codigoEdit}
                  onChange={(e) => setCodigoEdit(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-2">Descripción</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={descripcionEdit}
                  onChange={(e) => setDescripcionEdit(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-2">Precio venta</label>
                <div className="input-group">
                  <span className="input-group-text fs-5">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control form-control-lg"
                    value={precioEdit}
                    onChange={(e) => setPrecioEdit(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-2">Costo compra</label>
                <div className="input-group">
                  <span className="input-group-text fs-5">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control form-control-lg"
                    value={precioCompraEdit}
                    onChange={(e) => setPrecioCompraEdit(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-12">
                <div className="form-check fs-5 mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="activoEdit"
                    checked={activoEdit}
                    onChange={(e) => setActivoEdit(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="activoEdit">
                    <i className="bi bi-eye"/> Producto activo (visible en ventas)
                  </label>
                </div>
              </div>
            </div>
            <button 
              className="btn btn-primary w-100 mt-3 py-2 fw-bold fs-6"
              onClick={guardarCambiosProducto}
            >
              <i className="bi bi-check-circle-fill me-2"/> Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
