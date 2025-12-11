import { useState } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Formato de dinero
const formatMoney = (value) => {
  if (!value && value !== 0) return '$0.00';
  return `$${Number(value)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const estadoInicial = {
  codigo: '',
  descripcion: '',
  precio: '',
  precioCompra: '',
  proveedor: '',
  cantidad: '',
};

export default function AltasProductos() {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [precioEdit, setPrecioEdit] = useState('');
  const [precioCompraEdit, setPrecioCompraEdit] = useState('');
  const [activoEdit, setActivoEdit] = useState(true);
  const [codigoEdit, setCodigoEdit] = useState('');

  const queryClient = useQueryClient();

  const { data: productosRaw } = useQuery({
    queryKey: ['productos-altas'],
    queryFn: async () => {
      const res = await axios.get('/api/productos');
      return res.data;
    },
  });

  const productos = Array.isArray(productosRaw)
    ? productosRaw
    : Array.isArray(productosRaw?.content)
    ? productosRaw.content
    : [];

  const productosFiltrados = productos
    .filter((p) => {
      const q = busquedaProducto.toLowerCase();
      return (
        p.codigo?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.descripcion || !form.precio || !form.cantidad) {
      alert('Código, descripción, precio y cantidad son obligatorios');
      return;
    }

    try {
      setGuardando(true);
      const producto = {
        codigo: form.codigo,
        descripcion: form.descripcion,
        precio: parseFloat(form.precio),
        precioCompra:
          form.precioCompra === '' ? null : parseFloat(form.precioCompra),
        proveedor: form.proveedor || null,
        cantidad: parseInt(form.cantidad, 10),
        activo: true,
      };

      await axios.post('/api/productos', producto);
      alert('✅ Producto guardado correctamente');
      setForm(estadoInicial);
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar producto');
    } finally {
      setGuardando(false);
    }
  };

  const agregarStock = async () => {
    if (!productoSeleccionado) {
      alert('Selecciona un producto primero');
      return;
    }
    const cant = Number(cantidadAgregar);
    if (Number.isNaN(cant) || cant <= 0) {
      alert('La cantidad a agregar debe ser mayor a 0');
      return;
    }

    try {
      const res = await axios.post(
        `/api/productos/${productoSeleccionado.id}/agregar-stock`,
        null,
        { params: { cantidad: cant } }
      );
      alert(
        `✅ Se agregaron ${cant} unidades. Nuevo inventario: ${res.data.cantidad}`
      );
      setProductoSeleccionado(res.data);
      setCantidadAgregar('');
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    } catch (err) {
      console.error(err);
      alert('❌ Error al agregar inventario');
    }
  };

  const guardarCambiosProducto = async () => {
    if (!productoSeleccionado) {
      alert('Selecciona un producto primero');
      return;
    }

    const nuevaDescripcion =
      descripcionEdit.trim() || productoSeleccionado.descripcion;
    const nuevoPrecio =
      precioEdit === '' ? productoSeleccionado.precio : Number(precioEdit);
    const nuevoPrecioCompra =
      precioCompraEdit === ''
        ? productoSeleccionado.precioCompra
        : Number(precioCompraEdit);

    if (!nuevaDescripcion) {
      alert('La descripción no puede quedar vacía');
      return;
    }
    if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      alert('El precio debe ser un número mayor o igual a 0');
      return;
    }
    if (
      nuevoPrecioCompra != null &&
      (Number.isNaN(nuevoPrecioCompra) || nuevoPrecioCompra < 0)
    ) {
      alert('El costo de compra debe ser un número mayor o igual a 0');
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

      setProductoSeleccionado(null);
      setDescripcionEdit('');
      setPrecioEdit('');
      setPrecioCompraEdit('');
      setCodigoEdit('');
      setActivoEdit(true);
      setCantidadAgregar('');
      setBusquedaProducto('');
    } catch (err) {
      console.error(err);
      alert('❌ Error al actualizar producto');
    }
  };

  const totalProductos = productos.length;
  const productosActivos = productos.filter((p) => p.activo !== false).length;

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)', // 50px de margen lateral
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Header azul */}
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Gestión de productos</h5>
            <small className="text-white-80">
              Da de alta nuevos productos y ajusta inventario existente
            </small>
          </div>
          <div className="text-end big">
            <div>
              Total: <strong>{totalProductos}</strong>
            </div>
            <div className="text-warning">
              Activos: <strong>{productosActivos}</strong>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            {/* Columna izquierda: alta de producto */}
            <div className="col-md-6 border-end">
              <h6 className="mb-2">Alta de producto nuevo</h6>
              <form onSubmit={handleSubmit} className="row g-3">
                <div className="col-md-5">
                  <label className="form-label mb-1">Código de barras</label>
                  <input
                    type="text"
                    name="codigo"
                    className="form-control form-control-sm"
                    value={form.codigo}
                    onChange={handleChange}
                    placeholder="Escanear o escribir código"
                    autoFocus
                    required
                  />
                </div>

                <div className="col-md-7">
                  <label className="form-label mb-1">Descripción</label>
                  <input
                    type="text"
                    name="descripcion"
                    className="form-control form-control-sm"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Nombre del producto"
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label mb-1">Precio venta</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      name="precio"
                      className="form-control"
                      step="0.01"
                      min="0"
                      value={form.precio}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-4">
                  <label className="form-label mb-1">Costo de compra</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      name="precioCompra"
                      className="form-control"
                      step="0.01"
                      min="0"
                      value={form.precioCompra}
                      onChange={handleChange}
                    />
                  </div>
                  <small className="text-body-secondary">
                    Opcional. Útil para margen de ganancia.
                  </small>
                </div>

                <div className="col-md-4">
                  <label className="form-label mb-1">Inventario inicial</label>
                  <input
                    type="number"
                    name="cantidad"
                    className="form-control form-control-sm"
                    min="0"
                    value={form.cantidad}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label mb-1">Proveedor</label>
                  <input
                    type="text"
                    name="proveedor"
                    className="form-control form-control-sm"
                    value={form.proveedor}
                    onChange={handleChange}
                    placeholder="Opcional"
                  />
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setForm(estadoInicial)}
                    disabled={guardando}
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-success"
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando...' : 'Guardar producto'}
                  </button>
                </div>
              </form>
            </div>

            {/* Columna derecha: búsqueda, stock y edición */}
            <div className="col-md-6">
              <h6 className="mb-2">Inventario y edición</h6>

              {/* Buscador */}
              <div className="mb-2">
                <label className="form-label mb-1">
                  Buscar producto (código o descripción)
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Escribe o escanea el código..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                />
              </div>

              {/* Resultados de búsqueda */}
              {busquedaProducto && productosFiltrados.length > 0 && (
                <div
                  className="mb-3 border rounded small bg-body"
                  style={{ maxHeight: 180, overflowY: 'auto' }}
                >
                  <table className="table table-hover table-sm mb-0">
                    <tbody>
                      {productosFiltrados.map((p) => (
                        <tr
                          key={p.id}
                          style={{ cursor: 'pointer' }}
                          className={
                            productoSeleccionado?.id === p.id
                              ? 'table-primary'
                              : ''
                          }
                          onClick={() => {
                            setProductoSeleccionado(p);
                            setBusquedaProducto(p.descripcion);
                            setDescripcionEdit(p.descripcion || '');
                            setPrecioEdit(
                              p.precio != null ? String(p.precio) : ''
                            );
                            setPrecioCompraEdit(
                              p.precioCompra != null
                                ? String(p.precioCompra)
                                : ''
                            );
                            setActivoEdit(
                              p.activo == null ? true : p.activo
                            );
                            setCodigoEdit(p.codigo || '');
                          }}
                        >
                          <td
                            className="text-truncate"
                            style={{ maxWidth: 240 }}
                          >
                            <div className="fw-semibold">
                              {p.descripcion}
                            </div>
                            <div className="text-body-primary small">
                              Código: {p.codigo}
                            </div>
                          </td>
                          <td className="text-end align-middle">
                            <div className="fw-semibold text-success">
                              {formatMoney(p.precio ?? 0)}
                            </div>
                            <div className="text-body-primary small">
                              Costo:{' '}
                              {p.precioCompra != null
                                ? formatMoney(p.precioCompra)
                                : '-'}
                            </div>
                            <div className="text-body-primary small">
                              Stock: {p.cantidad}
                            </div>
                            <div className="text-body-primary small">
                                                            Estado:{' '}
                              {p.activo === false ? 'Inactivo' : 'Activo'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Panel de stock + edición */}
              {productoSeleccionado ? (
                <>
                  <div className="mb-2 small">
                    <div>
                      <strong>Seleccionado:</strong>{' '}
                      {productoSeleccionado.descripcion} (
                      {productoSeleccionado.codigo})
                    </div>
                    <div>
                      <strong>Stock actual:</strong>{' '}
                      {productoSeleccionado.cantidad}
                    </div>
                  </div>

                  {/* Agregar stock */}
                  <div className="mb-3 border rounded p-2 bg-body-tertiary">
                    <label className="form-label mb-1">
                      Agregar unidades al inventario
                    </label>
                    <div className="input-group input-group-sm mb-1">
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={cantidadAgregar}
                        onChange={(e) => setCantidadAgregar(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={agregarStock}
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="form-text">
                      Ejemplo: si tenías 10 y agregas 20, el inventario quedará
                      en 30.
                    </div>
                  </div>

                  {/* Edición de datos */}
                  <div className="border rounded p-2 bg-body">
                    <div className="mb-2">
                      <label className="form-label mb-1">
                        Modificar descripción
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={descripcionEdit}
                        onChange={(e) => setDescripcionEdit(e.target.value)}
                      />
                    </div>

                    <div className="mb-2">
                      <label className="form-label mb-1">
                        Modificar precio venta
                      </label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={precioEdit}
                          onChange={(e) => setPrecioEdit(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label mb-1">
                        Modificar costo de compra
                      </label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={precioCompraEdit}
                          onChange={(e) =>
                            setPrecioCompraEdit(e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label mb-1">
                        Modificar código
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={codigoEdit}
                        onChange={(e) => setCodigoEdit(e.target.value)}
                      />
                    </div>

                    <div className="mb-3 form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="activoEdit"
                        checked={activoEdit}
                        onChange={(e) => setActivoEdit(e.target.checked)}
                      />
                      <label
                        className="form-check-label small"
                        htmlFor="activoEdit"
                      >
                        Producto activo (visible y vendible)
                      </label>
                    </div>

                    <div className="d-flex justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-warning"
                        onClick={guardarCambiosProducto}
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="small text-body-secondary mt-2">
                  Busca y selecciona un producto para sumar inventario o
                  actualizar su información.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
