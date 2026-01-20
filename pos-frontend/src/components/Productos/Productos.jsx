import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import ProductoSearchProductos from './ProductoSearchProductos';
import ProductosPanel from './ProductosPanel';
import { imprimirCodigoBarras, imprimirCodigosBarrasMasivo} from '../../utils/PrintBarcode';


const estadoInicial = {
  codigo: '',
  descripcion: '',
  precio: '',
  precioCompra: '',
  proveedor: '',
  cantidad: '',
  imprimirCodigo: false,
};


// ⭐ GENERADOR DE CÓDIGOS ÚNICOS
const generarCodigoUnico = (codigosExistentes) => {
  const prefijo = '99'; // Prefijo para códigos internos (no comerciales)
  const min = 10000000; // 8 dígitos después del prefijo
  const max = 99999999;

  let intentos = 0;
  const maxIntentos = 100;

  while (intentos < maxIntentos) {
    const numero = Math.floor(Math.random() * (max - min + 1)) + min;
    const codigoGenerado = `${prefijo}${numero}`;

    // Verificar que no exista en la BD
    if (!codigosExistentes.includes(codigoGenerado)) {
      return codigoGenerado;
    }

    intentos++;
  }

  // Si falla, usar timestamp + random
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${prefijo}${timestamp}${random}`.slice(0, 10);
};


export default function Productos() {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');
  const [precioCompraAgregar, setPrecioCompraAgregar] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [precioEdit, setPrecioEdit] = useState('');
  const [precioCompraEdit, setPrecioCompraEdit] = useState('');
  const [activoEdit, setActivoEdit] = useState(true);
  const [codigoEdit, setCodigoEdit] = useState('');
  const [imprimiendoTodos, setImprimiendoTodos] = useState(false); // ⭐ NUEVO ESTADO
  const [soloActivos, setSoloActivos] = useState(true); // ⭐ CHECKBOX FILTRO ACTIVOS

  const inputBusquedaRef = useRef(null);
  const inputCodigoRef = useRef(null); // ⭐ REF PARA INPUT DE CÓDIGO
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      inputBusquedaRef.current?.focus();
      console.log('🎯 AUTOFOCUS aplicado en Productos');
    }, 150);

    return () => clearTimeout(timer);
  }, []);

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

  // ⭐ FILTRAR PRODUCTOS GENERADOS (99) SEGÚN ESTADO ACTIVO
  const productosGenerados = productos.filter(p => {
    const esGenerado = p.codigo?.toString().startsWith('99');
    if (!esGenerado) return false;
    
    // Si soloActivos está activado, filtrar por activo
    if (soloActivos) {
      return p.activo !== false;
    }
    
    // Si está desactivado, incluir todos (activos e inactivos)
    return true;
  });

  const seleccionarProducto = useCallback((producto) => {
    setProductoSeleccionado(producto);
    setBusquedaProducto(producto.descripcion);
    setDescripcionEdit(producto.descripcion || '');
    setPrecioEdit(producto.precio != null ? String(producto.precio) : '');
    setPrecioCompraEdit(producto.precioCompra != null ? String(producto.precioCompra) : '');
    setActivoEdit(producto.activo == null ? true : producto.activo);
    setCodigoEdit(producto.codigo || '');
    setCantidadAgregar('');
    setPrecioCompraAgregar(producto.precioCompra != null ? String(producto.precioCompra) : '');
    setCodigoEscaneado('');

    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    const bufferEscaner = { current: '' };
    let timerEscaner = null;
    let escaneando = false;

    const handleEscaneo = (e) => {
      const elementoActivo = document.activeElement;
      const esInput = elementoActivo?.tagName === 'INPUT';
      const esTextarea = elementoActivo?.tagName === 'TEXTAREA';
      const esSelect = elementoActivo?.tagName === 'SELECT';

      const esBuscadorTexto =
        elementoActivo === inputBusquedaRef.current &&
        elementoActivo?.type === 'text';

      if ((esInput || esTextarea || esSelect) && !esBuscadorTexto) {
        if (escaneando) {
          console.log('🧹 LIMPIANDO - Input activo');
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
          console.log('🔍 CÓDIGO ESCANEADO:', codigo);

          const producto = productos.find(
            p => p.codigo?.toString().trim() === codigo
          );

          if (producto) {
            console.log('✅ ENCONTRADO:', producto.descripcion);
            seleccionarProducto(producto);
          } else {
            console.log('❌ NO ENCONTRADO:', codigo);
            if (confirm(`Producto con código ${codigo} no existe.\n\n¿Quieres agregarlo como nuevo producto?`)) {
              setForm(prev => ({ ...prev, codigo: codigo }));
              setBusquedaProducto('');
              setCodigoEscaneado('');
              alert('✅ Código cargado en "Nuevo Producto". Completa los datos y guarda.');
            }
          }

          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
          timerEscaner = null;
        }
        return;
      }

      if (!/^[0-9]$/.test(e.key)) {
        return;
      }

      if (!esBuscadorTexto) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!escaneando) {
        console.log('🔢 INICIO ESCANEO PRODUCTOS');
        escaneando = true;
        bufferEscaner.current = '';
        setCodigoEscaneado('');
      }

      bufferEscaner.current += e.key;
      console.log('🔢', bufferEscaner.current);
      setCodigoEscaneado(bufferEscaner.current);

      clearTimeout(timerEscaner);
      timerEscaner = setTimeout(() => {
        console.log('⏱️ TIMEOUT');
        bufferEscaner.current = '';
        escaneando = false;
        setCodigoEscaneado('');
      }, 500);
    };

    window.addEventListener('keydown', handleEscaneo, true);
    console.log('✅ ESCÁNER PRODUCTOS ACTIVADO');

    return () => {
      window.removeEventListener('keydown', handleEscaneo, true);
      if (timerEscaner) clearTimeout(timerEscaner);
      console.log('❌ ESCÁNER PRODUCTOS DESACTIVADO');
    };
  }, [productos, seleccionarProducto]);

  const productosFiltrados = productos
    .filter((p) => {
      if (codigoEscaneado.length > 0) return false;
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

  // ⭐ HANDLER PARA GENERAR CÓDIGO ALEATORIO
  const handleGenerarCodigo = () => {
    const codigosExistentes = productos.map(p => p.codigo?.toString() || '');
    const nuevoCodigo = generarCodigoUnico(codigosExistentes);

    setForm(prev => ({ ...prev, codigo: nuevoCodigo }));

    console.log('🎲 CÓDIGO GENERADO:', nuevoCodigo);
  };

// ⭐ HANDLER PARA IMPRIMIR TODOS LOS CÓDIGOS GENERADOS (CON ORDEN ALFABÉTICO)
const handleImprimirTodosGenerados = async () => {
  if (productosGenerados.length === 0) {
    alert('❌ No hay productos con códigos generados (99) para imprimir');
    return;
  }

  const tipoProductos = soloActivos ? 'activos' : 'totales (activos e inactivos)';
  const confirmacion = true //confirm(
   // `🖨️ ¿Deseas imprimir ${productosGenerados.length} código(s) de barras ${tipoProductos}?\n\n` +
    //`Se abrirá una sola ventana con todos los códigos ordenados alfabéticamente.`
  //);

  if (!confirmacion) return;

  try {
    setImprimiendoTodos(true);

    // ⭐ ORDENAR ALFABÉTICAMENTE POR DESCRIPCIÓN
    const productosOrdenados = [...productosGenerados].sort((a, b) => {
      const descA = (a.descripcion || '').toLowerCase();
      const descB = (b.descripcion || '').toLowerCase();
      return descA.localeCompare(descB, 'es', { sensitivity: 'base' });
    });

    console.log('📋 Productos ordenados alfabéticamente:', 
      productosOrdenados.map(p => p.descripcion).join(', ')
    );

    // ⭐ IMPRIMIR TODOS EN UNA SOLA VENTANA (YA ORDENADOS)
    await imprimirCodigosBarrasMasivo(productosOrdenados);

    //alert(`✅ Se prepararon ${productosOrdenados.length} código(s) para impresión (ordenados A-Z)`);

  } catch (error) {
    console.error('❌ Error al imprimir códigos:', error);
    alert('❌ Error al preparar la impresión. Revisa la consola.');
  } finally {
    setImprimiendoTodos(false);
  }
};


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.codigo || !form.descripcion || !form.precio || !form.cantidad) {
      alert('Código, descripción, precio y cantidad son obligatorios');
      return;
    }

    // ⭐ VERIFICAR SI EL CÓDIGO YA EXISTE
    const existente = buscarProductoPorCodigoODescripcion(form.codigo, form.descripcion);

    if (existente) {
      // ⭐ NO HACER INSERT, SOLO SELECCIONAR EL INPUT
      alert(`⚠️ El código "${form.codigo}" ya existe en la base de datos.\n\nProducto: ${existente.descripcion}\nPrecio: $${existente.precio}`);

      // Enfocar el input de código para que el usuario corrija
      inputCodigoRef.current?.focus();
      inputCodigoRef.current?.select();

      return; // NO continuar con el insert
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

      const response = await axios.post('/api/productos', producto);

      if (form.imprimirCodigo) {
        await imprimirCodigoBarras({
          codigo: response.data.codigo || form.codigo,
          descripcion: response.data.descripcion || form.descripcion
        }, false);
      }

      alert('✅ Nuevo producto creado correctamente' +
        (form.imprimirCodigo ? ' y código enviado a impresora' : ''));

      setForm(estadoInicial);
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });

      setTimeout(() => {
        inputBusquedaRef.current?.focus();
      }, 50);
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
    setCodigoEscaneado('');

    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
  };

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '1.5rem 0' }}>
        <div className="card-header py-3 bg-primary text-white border-bottom-0">
          <div className="row align-items-center">
            <div className="col-md-5">
              <h5 className="mb-1">📦 Gestión de Productos</h5>
              <small className="opacity-75">
                Alta automática + inventario y edición (⏎=Enter)
                {codigoEscaneado.length > 0 && ' | 🔢 ESCÁNER ACTIVO'}
              </small>
            </div>
            <div className="col-md-3 text-center">
              <div className="fs-3 fw-bold">{totalProductos}</div>
              <small className="opacity-75">Total | {productosActivos} activos</small>
            </div>
            {/* ⭐ BOTÓN Y CHECKBOX PARA IMPRIMIR CÓDIGOS GENERADOS */}
            <div className="col-md-4 text-end">
              <div className="d-flex flex-column align-items-end gap-2">
                <button
                  className="btn btn-light btn-sm fw-bold"
                  onClick={handleImprimirTodosGenerados}
                  disabled={imprimiendoTodos || productosGenerados.length === 0}
                  title={`Imprimir ${productosGenerados.length} códigos generados (99)`}
                >
                  {imprimiendoTodos ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Imprimiendo...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-printer-fill me-2" />
                      Imprimir Códigos ({productosGenerados.length})
                    </>
                  )}
                </button>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="soloActivosCheck"
                    checked={soloActivos}
                    onChange={(e) => setSoloActivos(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="soloActivosCheck">
                    Solo productos activos
                  </label>
                </div>
              </div>
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
                      <i className="bi bi-plus-circle-fill me-2 text-success" />Nuevo Producto
                    </h6>
                  </div>

                  <form onSubmit={handleSubmit} className="row g-2">
                    <div className="col-12">
                      <label className="form-label fw-semibold mb-1 small">Código *</label>
                      <input
                        ref={inputCodigoRef}
                        type="text"
                        name="codigo"
                        className="form-control form-control-sm"
                        value={form.codigo}
                        onChange={handleChange}
                        placeholder="Escanear o generar código..."
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-success w-100 mt-2 btn-sm fw-bold"
                        onClick={handleGenerarCodigo}
                        title="Generar código aleatorio único"
                      >
                        <i className="bi bi-dice-5-fill me-2" />
                        Generar Código Aleatorio
                      </button>
                      <small className="text-muted d-block mt-1">
                        <i className="bi bi-info-circle me-1" />
                        Códigos internos: formato 99XXXXXXXX
                      </small>
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
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          name="imprimirCodigo"
                          id="imprimirCodigo"
                          checked={form.imprimirCodigo}
                          onChange={handleChange}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="imprimirCodigo">
                          <i className="bi bi-printer-fill me-1" /> Imprimir código de barras
                        </label>
                      </div>
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
                productoSeleccionado={productoSeleccionado}
                seleccionarProducto={seleccionarProducto}
                codigoEscaneado={codigoEscaneado}
                inputBusquedaRef={inputBusquedaRef}
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
