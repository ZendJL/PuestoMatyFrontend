import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import ProductoSearchProductos from './ProductoSearchProductos';
import ProductosPanel from './ProductosPanel';

const estadoInicial = {
  codigo: '',
  descripcion: '',
  precio: '',
  precioCompra: '',
  proveedor: '',
  cantidad: '',
};

export default function Productos() {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [precioCompraAgregar, setPrecioCompraAgregar] = useState('');
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

  const totalProductos = productos.length;
  const productosActivos = productos.filter((p) => p.activo !== false).length;

  const buscarProductoPorCodigoODescripcion = (codigo, descripcion) => {
    const cod = codigo?.trim().toLowerCase();
    const desc = descripcion?.trim().toLowerCase();
    if (!cod && !desc) return null;

    return productos.find(p =>
      (cod && p.codigo?.toLowerCase() === cod) ||
      (desc && p.descripcion?.toLowerCase() === desc)
    ) || null;
  };

  // ✅ ENTER EN BUSCADOR
  const handleEnterBusqueda = (e) => {
    if (e.key === 'Enter') {
      const query = busquedaProducto.trim();
      
      // Si no hay resultados Y es puro números (código de barras)
      if (productosFiltrados.length === 0 && /^\d+$/.test(query)) {
        if (confirm(`Producto con código ${query} no existe.\n\n¿Quieres agregarlo como nuevo producto?`)) {
          // ✅ AUTO-LLENAR CÓDIGO en formulario de nuevo producto
          setForm(prev => ({ ...prev, codigo: query }));
          setBusquedaProducto('');
          alert('✅ Código cargado en "Nuevo Producto". Completa los datos y guarda.');
        }
        return;
      }

      // Si encuentra UN producto, seleccionarlo automáticamente
      if (productosFiltrados.length === 1) {
        const producto = productosFiltrados[0];
        setProductoSeleccionado(producto);
        setDescripcionEdit(producto.descripcion || '');
        setPrecioEdit(producto.precio != null ? String(producto.precio) : '');
        setPrecioCompraEdit(producto.precioCompra != null ? String(producto.precioCompra) : '');
        setActivoEdit(producto.activo == null ? true : producto.activo);
        setCodigoEdit(producto.codigo || '');
        setPrecioCompraAgregar(producto.precioCompra != null ? String(producto.precioCompra) : '');
      }
    }
  };

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

    const existente = buscarProductoPorCodigoODescripcion(form.codigo, form.descripcion);
    
    if (existente) {
      setProductoSeleccionado(existente);
      setBusquedaProducto(existente.descripcion);
      setDescripcionEdit(existente.descripcion || '');
      setPrecioEdit(existente.precio != null ? String(existente.precio) : '');
      setPrecioCompraEdit(existente.precioCompra != null ? String(existente.precioCompra) : '');
      setActivoEdit(existente.activo == null ? true : existente.activo);
      setCodigoEdit(existente.codigo || '');
      setCantidadAgregar('');
      setPrecioCompraAgregar(existente.precioCompra != null ? String(existente.precioCompra) : '');
      
      alert('⚠️ Producto encontrado. ✅ Formulario de edición auto-llenado.');
      return;
    }

    try {
      setGuardando(true);
      const producto = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        precio: parseFloat(form.precio),
        precioCompra: form.precioCompra === '' ? null : parseFloat(form.precioCompra),
        proveedor: form.proveedor || null,
        cantidad: parseInt(form.cantidad, 10),
        activo: true,
      };

      await axios.post('/api/productos', producto);
      alert('✅ Nuevo producto creado correctamente');
      setForm(estadoInicial);
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    } catch (err) {
      console.error(err);
      alert('❌ Error al crear producto');
    } finally {
      setGuardando(false);
    }
  };

  const limpiarSeleccion = () => {
    setProductoSeleccionado(null);
    setDescripcionEdit('');
    setPrecioEdit('');
    setPrecioCompraEdit('');
    setCodigoEdit('');
    setActivoEdit(true);
    setCantidadAgregar('');
    setPrecioCompraAgregar('');
    setBusquedaProducto('');
  };

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '1.5rem 0' }}>
        <div className="card-header py-3 bg-primary text-white border-bottom-0">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h5 className="mb-1">📦 Gestión de Productos</h5>
              <small className="opacity-75">Alta automática + inventario y edición (⏎=Enter)</small>
            </div>
            <div className="col-md-4 text-end">
              <div className="fs-3 fw-bold">{totalProductos}</div>
              <small className="opacity-75">Total | {productosActivos} activos</small>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-lg-4">
              <div className="card border-start border-success border-3 shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">
                      <i className="bi bi-plus-circle-fill me-2 text-success"/>Nuevo Producto
                    </h6>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="row g-2">
                    <div className="col-12">
                      <label className="form-label fw-semibold mb-1 small">Código *</label>
                      <input
                        type="text"
                        name="codigo"
                        className="form-control form-control-sm"
                        value={form.codigo}
                        onChange={handleChange}
                        placeholder="Escanear código..."
                        autoFocus
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold mb-1 small">Descripción *</label>
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
                    <div className="col-6">
                      <label className="form-label fw-semibold mb-1 small">Precio venta *</label>
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
                    <div className="col-6">
                      <label className="form-label fw-semibold mb-1 small">Inventario inicial *</label>
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
                    <div className="col-12">
                      <label className="form-label fw-semibold mb-1 small">Costo compra</label>
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
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold mb-1 small">Proveedor</label>
                      <input
                        type="text"
                        name="proveedor"
                        className="form-control form-control-sm"
                        value={form.proveedor}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill btn-sm"
                        onClick={() => setForm(estadoInicial)}
                        disabled={guardando}
                      >
                        Limpiar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success flex-fill btn-sm fw-bold"
                        disabled={guardando}
                      >
                        {guardando ? 'Guardando...' : 'Crear Producto'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <ProductoSearchProductos
                productosFiltrados={productosFiltrados}
                busquedaProducto={busquedaProducto}
                setBusquedaProducto={setBusquedaProducto}
                onKeyDown={handleEnterBusqueda}  // ✅ PASAR HANDLER
                productoSeleccionado={productoSeleccionado}
                setProductoSeleccionado={setProductoSeleccionado}
                setDescripcionEdit={setDescripcionEdit}
                setPrecioEdit={setPrecioEdit}
                setPrecioCompraEdit={setPrecioCompraEdit}
                setActivoEdit={setActivoEdit}
                setCodigoEdit={setCodigoEdit}
                setPrecioCompraAgregar={setPrecioCompraAgregar}
                setForm={setForm}  // ✅ PASAR PARA AUTO-LLENAR
              />
              
              <ProductosPanel
                productoSeleccionado={productoSeleccionado}
                cantidadAgregar={cantidadAgregar}
                setCantidadAgregar={setCantidadAgregar}
                precioCompraAgregar={precioCompraAgregar}
                setPrecioCompraAgregar={setPrecioCompraAgregar}
                descripcionEdit={descripcionEdit}
                setDescripcionEdit={setDescripcionEdit}
                precioEdit={precioEdit}
                setPrecioEdit={setPrecioEdit}
                precioCompraEdit={precioCompraEdit}
                setPrecioCompraEdit={setPrecioCompraEdit}
                activoEdit={activoEdit}
                setActivoEdit={setActivoEdit}
                codigoEdit={codigoEdit}
                setCodigoEdit={setCodigoEdit}
                limpiarSeleccion={limpiarSeleccion}
                queryClient={queryClient}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
