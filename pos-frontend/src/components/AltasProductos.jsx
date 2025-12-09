import { useState } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const estadoInicial = {
  codigo: '',
  descripcion: '',
  precio: '',
  proveedor: '',
  cantidad: '',
};

export default function AltasProductos() {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  // Estado para agregar / editar producto existente
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [precioEdit, setPrecioEdit] = useState('');
  const [activoEdit, setActivoEdit] = useState(true);

  const queryClient = useQueryClient();

  // Cargar productos para el buscador
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
        proveedor: form.proveedor || null,
        cantidad: parseInt(form.cantidad, 10),
        activo: true, // nuevo producto activo por defecto
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
        `✅ Se agregaron ${cant} unidades. Nuevo Inventario: ${res.data.cantidad}`
      );
      setProductoSeleccionado(res.data);
      setCantidadAgregar('');
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    } catch (err) {
      console.error(err);
      alert('❌ Error al agregar Inventario');
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
      precioEdit === ''
        ? productoSeleccionado.precio
        : Number(precioEdit);

    if (!nuevaDescripcion) {
      alert('La descripción no puede quedar vacía');
      return;
    }
    if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      alert('El precio debe ser un número mayor o igual a 0');
      return;
    }

    try {
      const body = {
        ...productoSeleccionado,
        descripcion: nuevaDescripcion,
        precio: nuevoPrecio,
        activo: activoEdit,
      };

      const res = await axios.put(
        `/api/productos/${productoSeleccionado.id}`,
        body
      );

      alert('✅ Producto actualizado correctamente');
      setProductoSeleccionado(res.data);
      setDescripcionEdit('');
      setPrecioEdit('');
      setActivoEdit(res.data.activo ?? true);

      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    } catch (err) {
      console.error(err);
      alert('❌ Error al actualizar producto');
    }
  };

  return (
    <div className="row g-3">
      {/* Alta de producto nuevo */}
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-header py-2">
            <h5 className="mb-0">Alta de producto</h5>
          </div>
          <div className="card-body py-3">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
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

              <div className="col-md-8">
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
                <label className="form-label mb-1">Precio</label>
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
                <label className="form-label mb-1">Cantidad en inventario</label>
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

              <div className="col-md-4">
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
                  className="btn btn-sm btn-primary"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Buscar producto, agregar stock y modificar */}
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-header py-2">
            <h5 className="mb-0">
              Inventario y edición de producto existente
            </h5>
          </div>
          <div className="card-body py-3">
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

            {busquedaProducto && productosFiltrados.length > 0 && (
              <div
                className="mb-3 border rounded small"
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
                          setActivoEdit(
                            p.activo == null ? true : p.activo
                          );
                        }}
                      >
                        <td className="text-truncate" style={{ maxWidth: 240 }}>
                          <div className="fw-semibold">{p.descripcion}</div>
                          <div className="text-muted small">
                            Código: {p.codigo}
                          </div>
                        </td>
                        <td className="text-end align-middle">
                          <div className="fw-semibold text-success">
                            ${p.precio}
                          </div>
                          <div className="text-muted small">
                            Inventario: {p.cantidad}
                          </div>
                          <div className="text-muted small">
                            Estado:{' '}
                            {p.activo === false ? 'Desactivo' : 'Activo'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {productoSeleccionado && (
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
                <div className="mb-3">
                  <label className="form-label mb-1">
                    Agregar unidades al stock
                  </label>
                  <div className="input-group input-group-sm">
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
                    Ejemplo: si tenías 10 y agregas 20, el inventario quedará en
                    30.
                  </div>
                </div>

                {/* Editar descripción, precio y estado */}
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
                    Modificar precio
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
                    Guardar cambios de producto
                  </button>
                </div>
              </>
            )}

            {!productoSeleccionado && (
              <div className="small text-muted">
                Busca y selecciona un producto para registrar una nueva compra
                de proveedor, sumar al inventario o modificar su descripción,
                precio y estado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
