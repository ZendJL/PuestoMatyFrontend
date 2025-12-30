import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';
import { imprimirTicketVenta } from './TicketPrinter';
import ProductoSearch from './ProductoSearch';
import VentaTabla from './VentaTabla';
import ModoPago from './ModoPago';
import CuentaPrestamo from './CuentaPrestamo';
import CobroContado from './CobroContado';
import ResumenVenta from './ResumenVenta';

const DENOMINACIONES = [20, 30, 40, 50, 100, 150, 200, 250, 500, 1000];

export default function Venta() {
  const [venta, setVenta] = useState([]);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [modoPrestamo, setModoPrestamo] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [busquedaCuenta, setBusquedaCuenta] = useState('');
  const [pagoCliente, setPagoCliente] = useState('');
  const [pageSize, setPageSize] = useState(10);
  
  const inputBusquedaRef = useRef(null); // ⭐ REF para autofocus
  const queryClient = useQueryClient();

  // ✅ QUERIES
  const { data: productosRaw, isLoading, error } = useQuery({
    queryKey: ['productos-pos'],
    queryFn: async () => axios.get('/api/productos/activos').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: cuentasRaw } = useQuery({
    queryKey: ['cuentas-optimizadas-pos'],
    queryFn: async () => axios.get('/api/cuentas/optimizadas-pos').then(res => res.data),
    staleTime: 10 * 60 * 1000,
    enabled: modoPrestamo,
  });

  const productos = Array.isArray(productosRaw) ? productosRaw : productosRaw?.content || [];
  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];

  // ⭐ AUTOFOCUS al montar componente
  useEffect(() => {
    const timer = setTimeout(() => {
      inputBusquedaRef.current?.focus();
      console.log('🎯 AUTOFOCUS aplicado en Venta');
    }, 150);
    
    return () => clearTimeout(timer);
  }, []);

  // ⭐ LISTENER GLOBAL DE ESCANEO
  useEffect(() => {
    const bufferEscaner = { current: '' };
    let timerEscaner = null;
    let escaneando = false;

    const handleEscaneo = (e) => {
      // ⭐ SOLO ignorar inputs NUMÉRICOS y TEXTAREAS
      const elementoActivo = document.activeElement;
      const esInputNumerico = elementoActivo?.type === 'number';
      const esTextarea = elementoActivo?.tagName === 'TEXTAREA';
      
      if (esInputNumerico || esTextarea) {
        if (escaneando) {
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
        }
        return;
      }

      // ENTER - Procesar código completo
      if (e.key === 'Enter') {
        if (bufferEscaner.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          
          const codigo = bufferEscaner.current.trim();
          console.log('🔍 CÓDIGO ESCANEADO:', codigo, '(longitud:', codigo.length, ')');
          
          const producto = productos.find(
            p => p.codigo?.toString().trim() === codigo
          );
          
          if (producto) {
            console.log('✅ PRODUCTO ENCONTRADO:', producto.descripcion);
            agregarAlCarrito(producto);
          } else {
            console.log('❌ CÓDIGO NO ENCONTRADO:', codigo);
            alert(`Código "${codigo}" no encontrado en el inventario`);
          }
          
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
        }
        return;
      }

      // SOLO NÚMEROS
      if (!/^[0-9]$/.test(e.key)) {
        return;
      }

      // ⭐ CAPTURAR NÚMEROS (incluso en input de búsqueda)
      e.preventDefault();
      e.stopPropagation();

      if (!escaneando) {
        console.log('🔢 INICIO ESCANEO');
        escaneando = true;
        bufferEscaner.current = '';
        setCodigoEscaneado('');
      }

      bufferEscaner.current += e.key;
      console.log('🔢 BUFFER:', bufferEscaner.current);
      setCodigoEscaneado(bufferEscaner.current);

      clearTimeout(timerEscaner);
      timerEscaner = setTimeout(() => {
        console.log('⏱️ TIMEOUT - Limpiando buffer');
        bufferEscaner.current = '';
        escaneando = false;
        setCodigoEscaneado('');
      }, 300);
    };

    window.addEventListener('keydown', handleEscaneo, true);
    console.log('✅ ESCÁNER GLOBAL ACTIVADO');

    return () => {
      window.removeEventListener('keydown', handleEscaneo, true);
      clearTimeout(timerEscaner);
      console.log('❌ ESCÁNER GLOBAL DESACTIVADO');
    };
  }, [productos]);

  // ✅ FILTRADO PARA BÚSQUEDA MANUAL
  useEffect(() => {
    if (codigoEscaneado.length === 0) {
      setBusqueda(busquedaInput);
    }
  }, [busquedaInput, codigoEscaneado]);

  const cuentaSeleccionadaData = useMemo(() => {
    if (!cuentaSeleccionada?.id || !cuentas.length) return null;
    return cuentas.find(c => c.id === cuentaSeleccionada.id) || null;
  }, [cuentaSeleccionada?.id, cuentas]);

  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim() || codigoEscaneado.length > 0) return [];
    
    return productos
      .filter(p => {
        const q = busqueda.toLowerCase().trim();
        return (
          p.descripcion?.toLowerCase().includes(q) ||
          p.codigo?.toString().includes(q)
        );
      })
      .slice(0, 5);
  }, [busqueda, productos, codigoEscaneado]);

  const total = useMemo(() => venta.reduce((sum, item) => sum + item.precio * item.cantidad, 0), [venta]);
  const cambio = useMemo(() => {
    const pago = Number(pagoCliente);
    return Number.isNaN(pago) ? 0 : Math.max(pago - total, 0);
  }, [pagoCliente, total]);

  const agregarAlCarrito = useCallback((producto) => {
    console.log('➕ AGREGANDO:', producto.codigo, '-', producto.descripcion);
    
    const stock = producto.cantidad ?? 0;
    if (stock <= 0) {
      alert('❌ Sin inventario disponible');
      return;
    }

    const enCarrito = venta.find((i) => i.id === producto.id)?.cantidad ?? 0;
    const nuevaCantidad = enCarrito + 1;

    if (nuevaCantidad > stock) {
      alert(`❌ Máximo ${stock} unidades de "${producto.descripcion}"`);
      return;
    }

    setVenta((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) {
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          descripcion: producto.descripcion,
          codigo: producto.codigo,
          precio: producto.precio,
          cantidad: 1,
          stock,
        },
      ];
    });

    // ✅ LIMPIAR Y RE-ENFOCAR
    setBusquedaInput('');
    setBusqueda('');
    setCodigoEscaneado('');
    
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
  }, [venta]);

  const quitarDelCarrito = useCallback((id) => {
    setVenta(prev => prev.filter(item => item.id !== id));
  }, []);

  const cambiarCantidad = useCallback((id, nuevaCantidadRaw) => {
    let nuevaCantidad = Number(nuevaCantidadRaw);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) nuevaCantidad = 1;

    setVenta((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const stock = item.stock ?? 0;
        if (nuevaCantidad > stock) {
          alert(`No puedes vender más de ${stock} unidades`);
          return { ...item, cantidad: stock };
        }
        return { ...item, cantidad: nuevaCantidad };
      })
    );
  }, []);

  const aplicarDenominacion = useCallback((monto) => {
    setPagoCliente(String(monto.toFixed(2)));
  }, []);

  const limpiarVenta = useCallback(() => {
    setVenta([]);
    setModoPrestamo(false);
    setCuentaSeleccionada(null);
    setBusquedaCuenta('');
    setBusquedaInput('');
    setBusqueda('');
    setCodigoEscaneado('');
    setPagoCliente('');
    
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
  }, []);

  const finalizarVenta = async () => {
    if (venta.length === 0) return alert('Carrito vacío');
    if (modoPrestamo && !cuentaSeleccionada) return alert('Selecciona cuenta del cliente');
    if (!modoPrestamo) {
      const pago = Number(pagoCliente);
      if (Number.isNaN(pago) || pago < total) return alert('Pago insuficiente');
    }

    const invalido = venta.find(item => item.cantidad > (item.stock ?? 0));
    if (invalido) return alert(`Cantidad excede stock: ${invalido.descripcion}`);

    try {
      const ventaData = {
        fecha: new Date().toISOString(),
        cuentaId: modoPrestamo ? cuentaSeleccionada.id : null,
        total,
        status: modoPrestamo ? 'PRESTAMO' : 'COMPLETADA',
        pagoCliente: modoPrestamo ? null : Number(pagoCliente) || total,
        ventaProductos: venta.map(item => ({
          producto: { id: item.id, descripcion: item.descripcion },
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      };

      const respuesta = await axios.post('/api/ventas', ventaData);
      const ventaGuardada = respuesta.data;

      const mensajeCambio = !modoPrestamo && cambio > 0 ? `\nCambio: ${formatMoney(cambio)}` : '';
      alert(
        `✅ Venta #${ventaGuardada.id} registrada ` +
        (modoPrestamo ? `como préstamo (${cuentaSeleccionada.nombre})` : 'de contado') +
        ` por ${formatMoney(total)}${mensajeCambio}`
      );

      if (window.confirm('¿Imprimir ticket?')) {
        imprimirTicketVenta(ventaGuardada.id);
      }

      limpiarVenta();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['cuentas-prestamo'] }),
      ]);
    } catch (err) {
      alert('❌ Error al guardar venta');
      console.error(err);
    }
  };

  if (isLoading) return <div className="fs-6 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-6 text-center py-5">Error: {error.message}</div>;

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '1.5rem 0' }}>
        <div className="card-header py-3 bg-primary text-white border-bottom-0">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h5 className="mb-1">🛒 Punto de Venta</h5>
              <small className="opacity-75">
                {venta.length} productos
                {codigoEscaneado.length > 0 && ' | 🔢 ESCÁNER ACTIVO'}
              </small>
            </div>
            <div className="col-md-4 text-end">
              <div className="fs-2 fw-bold text-warning">{formatMoney(total)}</div>
              <small className="opacity-75">{modoPrestamo ? 'Por cobrar' : 'Total'}</small>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-lg-8">
              <ProductoSearch
                busquedaInput={busquedaInput}
                setBusquedaInput={setBusquedaInput}
                busqueda={busqueda}
                productosFiltrados={productosFiltrados}
                manejarSeleccionProducto={agregarAlCarrito}
                formatMoney={formatMoney}
                codigoEscaneado={codigoEscaneado}
                inputRef={inputBusquedaRef} // ⭐ PASAR REF
              />
              <VentaTabla
                carrito={venta}
                formatMoney={formatMoney}
                cambiarCantidad={cambiarCantidad}
                quitarDelCarrito={quitarDelCarrito}
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
            </div>

            <div className="col-lg-4">
              <div className="card mb-3 hover-shadow" 
                   style={{ cursor: 'pointer', minHeight: '130px', transition: 'all 0.2s' }}
                   onClick={() => setModoPrestamo(!modoPrestamo)}
                   title="Click para cambiar modo">
                <ModoPago modoPrestamo={modoPrestamo} setModoPrestamo={setModoPrestamo} />
              </div>

              {modoPrestamo && (
                <CuentaPrestamo
                  cuentas={cuentas}
                  cuentaSeleccionada={cuentaSeleccionada}
                  setCuentaSeleccionada={setCuentaSeleccionada}
                  busquedaCuenta={busquedaCuenta}
                  setBusquedaCuenta={setBusquedaCuenta}
                  formatMoney={formatMoney}
                  cuentaData={cuentaSeleccionadaData}
                />
              )}

              {!modoPrestamo && (
                <CobroContado
                  pagoCliente={pagoCliente}
                  setPagoCliente={setPagoCliente}
                  cambio={cambio}
                  formatMoney={formatMoney}
                  DENOMINACIONES={DENOMINACIONES}
                  aplicarDenominacion={aplicarDenominacion}
                />
              )}

              <ResumenVenta
                carrito={venta}
                total={total}
                pagoCliente={pagoCliente}
                cambio={cambio}
                modoPrestamo={modoPrestamo}
                formatMoney={formatMoney}
              />
            </div>
          </div>
        </div>

        <div className="card-footer bg-body-tertiary py-3 border-top">
          <div className="row g-2">
            <div className="col-md-6">
              <button className="btn btn-outline-secondary w-100 h-100" onClick={limpiarVenta}>
                <i className="bi bi-arrow-repeat me-2"/>Limpiar Todo
              </button>
            </div>
            <div className="col-md-6">
              <button 
                className={`btn w-100 h-100 fs-5 fw-bold text-white shadow-sm ${
                  venta.length === 0 || (modoPrestamo && !cuentaSeleccionada)
                    ? 'btn-secondary' 
                    : modoPrestamo ? 'btn-warning' : 'btn-success'
                }`} 
                onClick={finalizarVenta}
                disabled={venta.length === 0 || (modoPrestamo && !cuentaSeleccionada)}>
                <i className={`bi me-2 fs-4 ${
                  modoPrestamo ? 'bi-person-check-fill' : 'bi-check-circle-fill'
                }`}/>
                {modoPrestamo ? 'Registrar Préstamo' : 'Cobrar Venta'}
                <div className="small mt-1 opacity-90">{formatMoney(total)}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
