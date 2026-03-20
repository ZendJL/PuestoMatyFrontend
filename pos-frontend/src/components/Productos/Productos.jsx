import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import ProductoSearchProductos from './ProductoSearchProductos';
import ProductosPanel from './ProductosPanel';
import { imprimirCodigoBarras, imprimirCodigosBarrasMasivo } from '../../utils/PrintBarcode';

const STOCK_BAJO_UMBRAL = 5;

const estadoInicial = {
  codigo: '',
  descripcion: '',
  precio: '',
  precioCompra: '',
  proveedor: '',
  cantidad: '',
  imprimirCodigo: false,
};

const generarCodigoUnico = (codigosExistentes) => {
  const prefijo = '99';
  const min = 10000000;
  const max = 99999999;
  for (let i = 0; i < 100; i++) {
    const codigo = `${prefijo}${Math.floor(Math.random() * (max - min + 1)) + min}`;
    if (!codigosExistentes.includes(codigo)) return codigo;
  }
  return `${prefijo}${Date.now().toString().slice(-8)}`;
};

function ProveedorSelect({ value, onChange, proveedoresExistentes }) {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  const filtrados = useMemo(() =>
    proveedoresExistentes.filter(p =>
      p.toLowerCase().includes((abierto ? query : (value || '')).toLowerCase())
    )
  , [proveedoresExistentes, query, value, abierto]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const seleccionar = (val) => {
    onChange(val);
    setQuery('');
    setAbierto(false);
  };

  const limpiar = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar o escribir proveedor..."
          value={abierto ? query : (value || '')}
          onFocus={() => { setAbierto(true); setQuery(value || ''); }}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
        />
        {value && (
          <button type="button" className="btn btn-outline-secondary" onMouseDown={limpiar} title="Quitar proveedor">
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
      {abierto && (
        <div
          className="border rounded bg-white shadow-sm"
          style={{ position: 'absolute', zIndex: 1050, width: '100%', maxHeight: '220px', overflowY: 'auto', top: '100%' }}
        >
          {filtrados.length === 0 && query.trim() && (
            <div
              className="px-3 py-2 text-primary"
              style={{ cursor: 'pointer', fontSize: '0.95rem' }}
              onMouseDown={() => seleccionar(query.trim())}
            >
              <i className="bi bi-plus-circle me-1" />
              Agregar "<strong>{query.trim()}</strong>"
            </div>
          )}
          {filtrados.length === 0 && !query.trim() && (
            <div className="px-3 py-2 text-muted" style={{ fontSize: '0.95rem' }}>Sin proveedores registrados</div>
          )}
          {filtrados.map(prov => (
            <div
              key={prov}
              className={`px-3 py-2 ${value === prov ? 'bg-primary text-white' : 'text-dark'}`}
              style={{ cursor: 'pointer', fontSize: '0.95rem' }}
              onMouseDown={() => seleccionar(prov)}
              onMouseEnter={(e) => { if (value !== prov) e.currentTarget.classList.add('bg-light'); }}
              onMouseLeave={(e) => { if (value !== prov) e.currentTarget.classList.remove('bg-light'); }}
            >
              {prov}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Productos() {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [tabActiva, setTabActiva] = useState('nuevo');

  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [precioCompraAgregar, setPrecioCompraAgregar] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [precioEdit, setPrecioEdit] = useState('');
  const [precioCompraEdit, setPrecioCompraEdit] = useState('');
  const [proveedorEdit, setProveedorEdit] = useState('');
  const [activoEdit, setActivoEdit] = useState(true);
  const [codigoEdit, setCodigoEdit] = useState('');

  const [imprimiendoTodos, setImprimiendoTodos] = useState(false);
  const [soloActivos, setSoloActivos] = useState(true);
  const [mostrarStockBajo, setMostrarStockBajo] = useState(false);

  const inputBusquedaRef = useRef(null);
  const inputCodigoRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => inputBusquedaRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const { data: productosRaw } = useQuery({
    queryKey: ['productos-altas'],
    queryFn: () => axios.get('/api/productos').then(r => r.data),
  });

  const productos = useMemo(() =>
    Array.isArray(productosRaw) ? productosRaw
      : Array.isArray(productosRaw?.content) ? productosRaw.content
      : []
  , [productosRaw]);

  const proveedoresExistentes = useMemo(() => {
    const conteo = {};
    productos.forEach(p => {
      const prov = (p.proveedor || '').trim();
      if (prov) conteo[prov] = (conteo[prov] || 0) + 1;
    });
    return Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .map(([nombre]) => nombre);
  }, [productos]);

  const productosStockBajo = useMemo(() =>
    productos.filter(p => p.activo !== false && (p.cantidad ?? 0) <= STOCK_BAJO_UMBRAL && (p.cantidad ?? 0) >= 0)
  , [productos]);

  const productosGenerados = useMemo(() =>
    productos.filter(p => {
      const esGenerado = p.codigo?.toString().startsWith('99');
      if (!esGenerado) return false;
      return soloActivos ? p.activo !== false : true;
    })
  , [productos, soloActivos]);

  const limpiarSeleccion = useCallback(() => {
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setCantidadAgregar('');
    setPrecioCompraAgregar('');
    setDescripcionEdit('');
    setPrecioEdit('');
    setPrecioCompraEdit('');
    setProveedorEdit('');
    setActivoEdit(true);
    setCodigoEdit('');
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  }, []);

  const seleccionarProducto = useCallback((producto) => {
    setProductoSeleccionado(producto);
    setBusquedaProducto(producto.descripcion);
    setDescripcionEdit(producto.descripcion || '');
    setPrecioEdit(producto.precio != null ? String(producto.precio) : '');
    setPrecioCompraEdit(producto.precioCompra != null ? String(producto.precioCompra) : '');
    setProveedorEdit(producto.proveedor || '');
    setActivoEdit(producto.activo == null ? true : producto.activo);
    setCodigoEdit(producto.codigo || '');
    setCantidadAgregar('');
    setPrecioCompraAgregar(producto.precioCompra != null ? String(producto.precioCompra) : '');
    setCodigoEscaneado('');
    setTabActiva('buscar');
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const bufferEscaner = { current: '' };
    let timerEscaner = null;
    let escaneando = false;

    const handleEscaneo = (e) => {
      const elementoActivo = document.activeElement;
      const esBuscadorTexto = elementoActivo === inputBusquedaRef.current && elementoActivo?.type === 'text';
      const esInputOtro =
        (elementoActivo?.tagName === 'INPUT' ||
          elementoActivo?.tagName === 'TEXTAREA' ||
          elementoActivo?.tagName === 'SELECT') && !esBuscadorTexto;

      if (esInputOtro) {
        if (escaneando) {
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (bufferEscaner.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const codigo = bufferEscaner.current.trim();
          const producto = productos.find(p => p.codigo?.toString().trim() === codigo);
          if (producto) {
            seleccionarProducto(producto);
          } else {
            if (confirm(`Código ${codigo} no encontrado.\n¿Agregar como nuevo producto?`)) {
              setForm(prev => ({ ...prev, codigo }));
              setTabActiva('nuevo');
            }
          }
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
        }
        return;
      }

      if (!/^[0-9]$/.test(e.key)) return;
      if (!esBuscadorTexto) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!escaneando) {
        escaneando = true;
        bufferEscaner.current = '';
        setCodigoEscaneado('');
      }

      bufferEscaner.current += e.key;
      setCodigoEscaneado(bufferEscaner.current);
      clearTimeout(timerEscaner);
      timerEscaner = setTimeout(() => {
        bufferEscaner.current = '';
        escaneando = false;
        setCodigoEscaneado('');
      }, 500);
    };

    window.addEventListener('keydown', handleEscaneo, true);
    return () => {
      window.removeEventListener('keydown', handleEscaneo, true);
      clearTimeout(timerEscaner);
    };
  }, [productos, seleccionarProducto]);

  const productosFiltrados = useMemo(() =>
    productos.filter(p => {
      if (codigoEscaneado.length > 0) return false;
      if (!busquedaProducto.trim()) return false;
      const q = busquedaProducto.toLowerCase();
      const activo = soloActivos ? p.activo !== false : true;
      return activo && (
        p.codigo?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    }).slice(0, 10)
  , [productos, busquedaProducto, codigoEscaneado, soloActivos]);

  const totalProductos = productos.length;
  const productosActivos = useMemo(() => productos.filter(p => p.activo !== false).length, [productos]);

  const handleGenerarCodigo = () => {
    const codigosExistentes = productos.map(p => p.codigo?.toString() || '');
    setForm(prev => ({ ...prev, codigo: generarCodigoUnico(codigosExistentes) }));
  };

  const handleImprimirTodosGenerados = async () => {
    if (productosGenerados.length === 0) {
      alert('No hay productos con códigos generados (99) para imprimir');
      return;
    }
    try {
      setImprimiendoTodos(true);
      const ordenados = [...productosGenerados].sort((a, b) =>
        (a.descripcion || '').toLowerCase().localeCompare((b.descripcion || '').toLowerCase(), 'es', { sensitivity: 'base' })
      );
      await imprimirCodigosBarrasMasivo(ordenados);
    } catch {
      alert('Error al preparar la impresión');
    } finally {
      setImprimiendoTodos(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.codigo.trim() || !form.descripcion.trim() || form.precio === '') return;
    setGuardando(true);
    try {
      const payload = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        precio: parseFloat(form.precio),
        precioCompra: form.precioCompra !== '' ? parseFloat(form.precioCompra) : null,
        proveedor: form.proveedor.trim() || null,
        cantidad: parseInt(form.cantidad || '0', 10),
        activo: true,
      };
      await axios.post('/api/productos', payload);
      if (form.imprimirCodigo) {
        await imprimirCodigoBarras(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      setForm(estadoInicial);
      inputCodigoRef.current?.focus();
    } catch (err) {
      alert('Error al guardar: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarCambios = async () => {
    if (!productoSeleccionado) return;
    try {
      await axios.put(`/api/productos/${productoSeleccionado.id}`, {
        codigo: codigoEdit.trim(),
        descripcion: descripcionEdit.trim(),
        precio: parseFloat(precioEdit),
        precioCompra: precioCompraEdit !== '' ? parseFloat(precioCompraEdit) : null,
        proveedor: proveedorEdit.trim() || null,
        activo: activoEdit,
        cantidad: productoSeleccionado.cantidad,
      });
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      alert('✅ Cambios guardados');
    } catch (err) {
      alert('Error al guardar: ' + (err.response?.data?.message || err.message));
    }
  };

  const inventarioBadge = (cantidad) => {
    const n = cantidad ?? 0;
    if (n === 0) return 'bg-danger';
    if (n <= STOCK_BAJO_UMBRAL) return 'bg-warning text-dark';
    return 'bg-success';
  };

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* HEADER */}
      <div
        className="text-white px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)', minHeight: 54 }}
      >
        <div>
          <h5 className="mb-0 fw-bold">
            <span className="me-2" style={{ fontSize: '1.3rem' }}>📦</span>
            Gestión de Productos
          </h5>
          <small className="opacity-75">{totalProductos} total · {productosActivos} activos</small>
        </div>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="form-check form-switch mb-0 text-white">
            <input
              className="form-check-input"
              type="checkbox"
              id="soloActivosCheck"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              style={{ width: '2.5em', height: '1.25em' }}
            />
            <label className="form-check-label fw-semibold ms-2" htmlFor="soloActivosCheck">
              Sólo activos
            </label>
          </div>
          <button
            className="btn btn-light fw-semibold"
            onClick={handleImprimirTodosGenerados}
            disabled={imprimiendoTodos || productosGenerados.length === 0}
          >
            {imprimiendoTodos
              ? <><span className="spinner-border spinner-border-sm me-1" />Imprimiendo...</>
              : <><i className="bi bi-printer-fill me-1" />Códigos ({productosGenerados.length})</>}
          </button>
        </div>
      </div>

      {/* ALERTA INVENTARIO BAJO */}
      {productosStockBajo.length > 0 && (
        <div className="flex-shrink-0 border-bottom">
          <button
            className="btn btn-warning w-100 rounded-0 d-flex align-items-center justify-content-between py-2 px-4 fw-bold"
            style={{ fontSize: '1rem' }}
            onClick={() => setMostrarStockBajo(!mostrarStockBajo)}
          >
            <span>
              ⚠️ {productosStockBajo.length} producto{productosStockBajo.length !== 1 ? 's' : ''} con inventario bajo (≤{STOCK_BAJO_UMBRAL})
            </span>
            <i className={`bi ${mostrarStockBajo ? 'bi-chevron-up' : 'bi-chevron-down'} fs-5`} />
          </button>
          {mostrarStockBajo && (
            <div className="p-2 bg-warning bg-opacity-10" style={{ maxHeight: '260px', overflowY: 'auto' }}>
              <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.95rem' }}>
                <thead className="table-warning sticky-top">
                  <tr>
                    <th>Producto</th>
                    <th className="text-center" style={{ width: 100 }}>Inventario</th>
                    <th className="text-center" style={{ width: 80 }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {[...productosStockBajo]
                    .sort((a, b) => (a.cantidad ?? 0) - (b.cantidad ?? 0))
                    .map(p => (
                      <tr key={p.id} style={{ height: '48px' }}>
                        <td className="align-middle">
                          <div className="fw-semibold">{p.descripcion}</div>
                          <small className="text-muted">#{p.codigo}</small>
                        </td>
                        <td className="text-center align-middle">
                          <span className={`badge fs-6 px-3 py-2 ${inventarioBadge(p.cantidad)}`}>
                            {p.cantidad ?? 0}
                          </span>
                        </td>
                        <td className="text-center align-middle">
                          <button
                            className="btn btn-primary"
                            onClick={() => { seleccionarProducto(p); setMostrarStockBajo(false); }}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="flex-shrink-0 border-bottom bg-body">
        <ul className="nav nav-tabs nav-fill px-3 pt-2 mb-0">
          {[
            { key: 'nuevo', label: 'Agregar nuevo', icon: 'bi-plus-circle', color: 'text-success' },
            { key: 'buscar', label: 'Buscar / Editar', icon: 'bi-search', color: 'text-primary' },
          ].map(tab => (
            <li className="nav-item" key={tab.key}>
              <button
                className={`nav-link fw-semibold fs-6 py-3 ${
                  tabActiva === tab.key
                    ? `active ${tab.color}`
                    : 'text-secondary'
                }`}
                onClick={() => setTabActiva(tab.key)}
              >
                <i className={`bi ${tab.icon} me-2 fs-5`} />
                {tab.label}
                {tab.key === 'buscar' && productoSeleccionado && (
                  <span className="badge bg-primary ms-2">1</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* CUERPO */}
      <div className="flex-fill overflow-auto p-4">

        {/* TAB NUEVO */}
        {tabActiva === 'nuevo' && (
          <form onSubmit={handleSubmit}>
            <div className="row g-3">

              <div className="col-md-5">
                <label className="form-label fw-semibold mb-1">Código *</label>
                <div className="input-group">
                  <input
                    ref={inputCodigoRef}
                    type="text"
                    name="codigo"
                    className="form-control form-control-lg"
                    value={form.codigo}
                    onChange={handleChange}
                    placeholder="Escanear o escribir"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={handleGenerarCodigo}
                    title="Generar código interno"
                  >
                    <i className="bi bi-dice-5-fill me-1" />Generar
                  </button>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>Códigos internos: 99XXXXXXXX</div>
              </div>

              <div className="col-md-7">
                <label className="form-label fw-semibold mb-1">Descripción *</label>
                <input
                  type="text"
                  name="descripcion"
                  className="form-control form-control-lg"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold mb-1">Precio de venta *</label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text fw-bold">$</span>
                  <input
                    type="number"
                    name="precio"
                    className="form-control"
                    step="0.01" min="0"
                    value={form.precio}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold mb-1">Costo de compra</label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text fw-bold">$</span>
                  <input
                    type="number"
                    name="precioCompra"
                    className="form-control"
                    step="0.01" min="0"
                    value={form.precioCompra}
                    onChange={handleChange}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div className="col-md-2">
                <label className="form-label fw-semibold mb-1">Cantidad inicial</label>
                <input
                  type="number"
                  name="cantidad"
                  className="form-control form-control-lg"
                  min="0"
                  value={form.cantidad}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold mb-1">
                  Proveedor <span className="text-muted fw-normal">(opcional)</span>
                </label>
                <ProveedorSelect
                  value={form.proveedor}
                  onChange={(val) => setForm(prev => ({ ...prev, proveedor: val }))}
                  proveedoresExistentes={proveedoresExistentes}
                />
              </div>

              <div className="col-12 d-flex align-items-center gap-4 flex-wrap pt-1">
                <div className="form-check form-check-lg">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="imprimirCodigo"
                    id="imprimirCodigo"
                    checked={form.imprimirCodigo}
                    onChange={handleChange}
                    style={{ width: '1.4em', height: '1.4em' }}
                  />
                  <label className="form-check-label fw-semibold ms-2 fs-6" htmlFor="imprimirCodigo">
                    Imprimir código al guardar
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-success btn-lg fw-bold px-5"
                  disabled={guardando}
                >
                  {guardando
                    ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                    : <><i className="bi bi-save-fill me-2" />Guardar producto</>}
                </button>
              </div>

            </div>
          </form>
        )}

        {/* TAB BUSCAR / EDITAR */}
        {tabActiva === 'buscar' && (
          <div>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold mb-1">Buscar por código o descripción</label>
                <input
                  ref={inputBusquedaRef}
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Escribe o escanea..."
                  value={busquedaProducto}
                  onChange={(e) => {
                    setBusquedaProducto(e.target.value);
                    if (!e.target.value.trim()) limpiarSeleccion();
                  }}
                  autoFocus
                />
                {codigoEscaneado && (
                  <div className="alert alert-info py-2 mt-2 mb-0">
                    <i className="bi bi-upc-scan me-2" />
                    Escaneando: <strong className="fs-5">{codigoEscaneado}</strong>
                  </div>
                )}
              </div>
            </div>

            {!productoSeleccionado && (
              <div className="border rounded mb-3" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {!busquedaProducto.trim() ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-upc-scan fs-1 d-block mb-3 opacity-50" />
                    <div className="fs-5">Escribe para buscar o escanea un código</div>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-search fs-1 d-block mb-3 opacity-50" />
                    <div className="fs-5">Sin resultados para "<strong>{busquedaProducto}</strong>"</div>
                  </div>
                ) : (
                  <table className="table table-hover mb-0" style={{ fontSize: '1rem' }}>
                    <thead className="table-light sticky-top">
                      <tr>
                        <th className="py-3">Descripción</th>
                        <th className="py-3">Código</th>
                        <th className="py-3">Proveedor</th>
                        <th className="text-end py-3">Precio</th>
                        <th className="text-center py-3">Inventario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.map(p => (
                        <tr
                          key={p.id}
                          onClick={() => seleccionarProducto(p)}
                          style={{ cursor: 'pointer', height: '56px' }}
                          className="align-middle"
                        >
                          <td className="fw-semibold fs-6">{p.descripcion}</td>
                          <td className="text-muted">{p.codigo}</td>
                          <td className="text-muted">{p.proveedor || '—'}</td>
                          <td className="text-end fw-bold">${Number(p.precio || 0).toFixed(2)}</td>
                          <td className="text-center">
                            <span className={`badge fs-6 px-3 py-2 ${inventarioBadge(p.cantidad)}`}>
                              {p.cantidad ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {productoSeleccionado && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                  <div>
                    <h5 className="mb-1 fw-bold">{productoSeleccionado.descripcion}</h5>
                    <span className="text-muted me-3">#{productoSeleccionado.codigo}</span>
                    <span className={`fw-semibold fs-5 ${
                      (productoSeleccionado.cantidad ?? 0) <= STOCK_BAJO_UMBRAL ? 'text-danger' : 'text-success'
                    }`}>
                      {productoSeleccionado.cantidad ?? 0} en inventario
                    </span>
                  </div>
                  <button className="btn btn-outline-secondary btn-lg" onClick={limpiarSeleccion}>
                    <i className="bi bi-x-lg me-2" />Cambiar producto
                  </button>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold mb-1">Código</label>
                    <input type="text" className="form-control form-control-lg" value={codigoEdit}
                      onChange={(e) => setCodigoEdit(e.target.value)} />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label fw-semibold mb-1">Descripción</label>
                    <input type="text" className="form-control form-control-lg" value={descripcionEdit}
                      onChange={(e) => setDescripcionEdit(e.target.value)} />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold mb-1">Precio de venta</label>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text">$</span>
                      <input type="number" className="form-control" min="0" step="0.01"
                        value={precioEdit} onChange={(e) => setPrecioEdit(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-semibold mb-1">Costo de compra</label>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text">$</span>
                      <input type="number" className="form-control" min="0" step="0.01"
                        value={precioCompraEdit} onChange={(e) => setPrecioCompraEdit(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-1">
                      Proveedor <span className="text-muted fw-normal">(opcional)</span>
                    </label>
                    <ProveedorSelect value={proveedorEdit} onChange={setProveedorEdit}
                      proveedoresExistentes={proveedoresExistentes} />
                  </div>
                  <div className="col-md-4 d-flex align-items-end pb-1">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="activoEdit"
                        checked={activoEdit} onChange={(e) => setActivoEdit(e.target.checked)}
                        style={{ width: '2.5em', height: '1.25em' }} />
                      <label className="form-check-label fw-semibold fs-6 ms-2" htmlFor="activoEdit">
                        Producto activo
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button className="btn btn-primary btn-lg fw-bold w-100" onClick={handleGuardarCambios}>
                      <i className="bi bi-save2-fill me-2" />Guardar cambios
                    </button>
                  </div>
                </div>

                <div className="border-top pt-4">
                  <p className="fw-bold mb-3 fs-6 text-uppercase text-muted">
                    <i className="bi bi-box-arrow-in-down me-2" />Agregar al inventario
                  </p>
                  <ProductosPanel
                    productoSeleccionado={productoSeleccionado}
                    cantidadAgregar={cantidadAgregar}
                    setCantidadAgregar={setCantidadAgregar}
                    precioCompraAgregar={precioCompraAgregar}
                    setPrecioCompraAgregar={setPrecioCompraAgregar}
                    limpiarSeleccion={limpiarSeleccion}
                    setProductoSeleccionado={setProductoSeleccionado}
                  />
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
