import { useState, useMemo, useEffect } from 'react';
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
  const [busqueda, setBusqueda] = useState('');
  const [modoPrestamo, setModoPrestamo] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [busquedaCuenta, setBusquedaCuenta] = useState('');
  const [pagoCliente, setPagoCliente] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [cuentasCache, setCuentasCache] = useState({}); // ✅ CACHE LOCAL

  const queryClient = useQueryClient();

  // ✅ PRODUCTOS - SOLO UNA VEZ AL INICIO
  const { data: productosRaw, isLoading, error } = useQuery({
    queryKey: ['productos-pos'],
    queryFn: async () => axios.get('/api/productos/activos').then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutos cache
  });

 const { data: cuentasRaw } = useQuery({
  queryKey: ['cuentas-prestamo'], 
  queryFn: async () => {
    const res = await axios.get('/api/cuentas'); // ✅ TODAS las cuentas
    return res.data;
  },
  staleTime: 10 * 60 * 1000, // 10min cache
  cacheTime: 15 * 60 * 1000, // 15min memoria
});


  // ✅ CUENTAS OPTIMIZADAS - NO RELOAD CONSTANTEMENTE
  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];
  //const cuentasCliente = useMemo(() => {
  //  return cuentas.filter(c => c.saldo > 0);
  //}, [cuentas]);
  

  const productos = Array.isArray(productosRaw) ? productosRaw : productosRaw?.content || [];

  const productosFiltrados = productos
    .filter(p => {
      const q = busqueda.toLowerCase();
      return p.codigo?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q);
    })
    .slice(0, 10);

  const total = useMemo(() => venta.reduce((sum, item) => sum + item.precio * item.cantidad, 0), [venta]);
  const cambio = useMemo(() => {
    const pago = Number(pagoCliente);
    return Number.isNaN(pago) ? 0 : Math.max(pago - total, 0);
  }, [pagoCliente, total]);

  // ✅ OPTIMIZADO: Solo cuando cambia cuentaSeleccionada
  const cuentaData = useQuery({
    queryKey: ['cuenta-data', cuentaSeleccionada?.id],
    queryFn: async () => {
      if (!cuentaSeleccionada?.id) return null;
      
      // ✅ ENDPOINT OPTIMIZADO - 1 query en lugar de 3
      const res = await axios.get(`/api/cuentas/${cuentaSeleccionada.id}/resumen`);
      return res.data;
    },
    enabled: !!cuentaSeleccionada?.id && modoPrestamo,
    staleTime: 30 * 1000, // 30s cache
  });

  const agregarAlCarrito = (producto) => {
    const stock = producto.cantidad ?? 0;
    if (stock <= 0) {
      alert('Sin inventario disponible');
      return;
    }

    const enCarrito = venta.find((i) => i.id === producto.id)?.cantidad ?? 0;
    const nuevaCantidad = enCarrito + 1;

    if (nuevaCantidad > stock) {
      alert(`No puedes vender más de ${stock} unidades de ${producto.descripcion}`);
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

    setBusqueda('');
  };

  const manejarSeleccionProducto = (producto) => agregarAlCarrito(producto);
  const manejarSeleccionPorEnter = () => {
    if (!busqueda) return;
    const exacto = productos.find(p => p.codigo?.toLowerCase() === busqueda.toLowerCase());
    if (exacto) return manejarSeleccionProducto(exacto);
    if (productosFiltrados.length > 0) manejarSeleccionProducto(productosFiltrados[0]);
  };

  const quitarDelCarrito = (id) => setVenta(prev => prev.filter(item => item.id !== id));
  const cambiarCantidad = (id, nuevaCantidadRaw) => {
    let nuevaCantidad = Number(nuevaCantidadRaw);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) nuevaCantidad = 1;

    setVenta((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const stock = item.stock ?? 0;
        if (nuevaCantidad > stock) {
          alert(`No puedes vender más de ${stock} unidades de ${item.descripcion}`);
          return { ...item, cantidad: stock };
        }
        return { ...item, cantidad: nuevaCantidad };
      })
    );
  };

  const aplicarDenominacion = (monto) => setPagoCliente(String(monto.toFixed(2)));
  const limpiarVenta = () => {
    setVenta([]);
    setModoPrestamo(false);
    setCuentaSeleccionada(null);
    setBusquedaCuenta('');
    setBusqueda('');
    setPagoCliente('');
  };

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
        imprimirTicketVenta(ventaGuardada, { total, pagoCliente, cambio, modoPrestamo, cuentaSeleccionada });
      }

      limpiarVenta();
      // ✅ INVALIDAR SOLO LO NECESARIO
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['cuentas-prestamo'] }),
      ]);
    } catch (err) {
      alert('❌ Error al guardar venta');
    }
  };

  if (isLoading) return <div className="fs-6 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-6 text-center py-5">Error: {error.message}</div>;

     return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '1.5rem 0' }}>
        {/* HEADER OPTIMIZADO */}
        <div className="card-header py-3 bg-primary text-white border-bottom-0">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h5 className="mb-1">🛒 Punto de Venta</h5>
              <small className="opacity-75">{venta.length} productos</small>
            </div>
            <div className="col-md-4 text-end">
              <div className="fs-2 fw-bold text-warning">{formatMoney(total)}</div>
              <small className="opacity-75">{modoPrestamo ? 'Por cobrar' : 'Total'}</small>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            {/* COLUMNA IZQUIERDA - PRODUCTOS */}
            <div className="col-lg-8">
              <ProductoSearch
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                productosFiltrados={productosFiltrados}
                manejarSeleccionProducto={manejarSeleccionProducto}
                manejarSeleccionPorEnter={manejarSeleccionPorEnter}
                formatMoney={formatMoney}
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

            {/* COLUMNA DERECHA - PAGO */}
            <div className="col-lg-4">
              {/* MODO PAGO */}
              <div className="card mb-3 hover-shadow" 
                   style={{ cursor: 'pointer', minHeight: '130px', transition: 'all 0.2s' }}
                   onClick={() => setModoPrestamo(!modoPrestamo)}
                   title="Click para cambiar modo">
                <ModoPago modoPrestamo={modoPrestamo} setModoPrestamo={setModoPrestamo} />
              </div>

              {/* CUENTA PRESTAMO - OPTIMIZADO */}
              {modoPrestamo && (
                <CuentaPrestamo
                  cuentas={cuentas}
                  cuentaSeleccionada={cuentaSeleccionada}
                  setCuentaSeleccionada={setCuentaSeleccionada}
                  busquedaCuenta={busquedaCuenta}
                  setBusquedaCuenta={setBusquedaCuenta}
                  formatMoney={formatMoney}
                  cuentaData={cuentaData.data} // ✅ DATO OPTIMIZADO
                  isLoadingCuenta={cuentaData.isLoading}
                />
              )}

              {/* COBRO CONTADO */}
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

        {/* FOOTER OPTIMIZADO */}
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
