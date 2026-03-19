import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';
import { imprimirTicketVenta } from './TicketPrinter';
import ProductoSearch from './ProductoSearch';
import VentaTabla from './VentaTabla';
import ModoPago from './ModoPago';
import CuentaPrestamo from './CuentaPrestamo';
import CobroContado from './CobroContado';
import { useTasaCambio } from '../../context/TasaCambioContext';

const DENOMINACIONES = [20, 30, 40, 50, 100, 150, 200, 250, 500, 1000];

const ETIQUETA_MODO_PAGO = {
  PESOS:   '🇲🇽 Pesos mexicanos',
  DOLARES: '🇺🇸 Dólares',
  TARJETA: '💳 Tarjeta',
  MIXTO:   '🔀 Mixto (pesos + dólares)',
};

export default function Venta() {
  const [venta, setVenta] = useState([]);
  const [busquedaCodigo, setBusquedaCodigo] = useState('');
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [modoPrestamo, setModoPrestamo] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [busquedaCuenta, setBusquedaCuenta] = useState('');
  const [pagoCliente, setPagoCliente] = useState('');
  const [pageSize] = useState(20);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const { tasaCambio } = useTasaCambio();
  const [modoPago, setModoPago] = useState('PESOS');
  const [pagoDolares, setPagoDolares] = useState('');
  const [pagoMixtoPesos, setPayoMixtoPesos] = useState('');
  const [pagoMixtoDolares, setPagoMixtoDolares] = useState('');

  const queryClient = useQueryClient();

  const { data: productosRaw, isLoading, error } = useQuery({
    queryKey: ['productos-pos'],
    queryFn: () => axios.get('/api/productos/activos').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: cuentasRaw } = useQuery({
    queryKey: ['cuentas-optimizadas-pos'],
    queryFn: () => axios.get('/api/cuentas/optimizadas-pos').then(res => res.data),
    staleTime: 10 * 60 * 1000,
    enabled: modoPrestamo,
  });

  const productos = Array.isArray(productosRaw) ? productosRaw : productosRaw?.content || [];
  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];

  useEffect(() => {
    const bufferEscaner = { current: '' };
    let timerEscaner = null;
    let escaneando = false;

    const handleEscaneo = (e) => {
      const elementoActivo = document.activeElement;
      if (elementoActivo?.type === 'number' || elementoActivo?.tagName === 'TEXTAREA') {
        if (escaneando) { bufferEscaner.current = ''; escaneando = false; setCodigoEscaneado(''); clearTimeout(timerEscaner); }
        return;
      }
      if (e.key === 'Enter') {
        if (bufferEscaner.current.length > 0) {
          e.preventDefault(); e.stopPropagation();
          const codigo = bufferEscaner.current.trim();
          const producto = productos.find(p => p.codigo?.toString().trim() === codigo);
          if (producto) agregarAlCarrito(producto);
          else alert(`Código "${codigo}" no encontrado`);
          bufferEscaner.current = ''; escaneando = false; setCodigoEscaneado('');
        }
        return;
      }
      if (!/^[0-9]$/.test(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (!escaneando) { escaneando = true; bufferEscaner.current = ''; setCodigoEscaneado(''); }
      bufferEscaner.current += e.key;
      setCodigoEscaneado(bufferEscaner.current);
      clearTimeout(timerEscaner);
      timerEscaner = setTimeout(() => { bufferEscaner.current = ''; escaneando = false; setCodigoEscaneado(''); }, 300);
    };

    window.addEventListener('keydown', handleEscaneo, true);
    return () => { window.removeEventListener('keydown', handleEscaneo, true); clearTimeout(timerEscaner); };
  }, [productos]);

  const cuentaSeleccionadaData = useMemo(() => {
    if (!cuentaSeleccionada?.id || !cuentas.length) return null;
    return cuentas.find(c => c.id === cuentaSeleccionada.id) || null;
  }, [cuentaSeleccionada?.id, cuentas]);

  const productosFiltrados = useMemo(() => {
    if (codigoEscaneado.length > 0 || (busquedaCodigo && busquedaCodigo.trim())) return [];
    if (busquedaNombre?.trim()) {
      const q = busquedaNombre.toLowerCase().trim();
      return productos.filter(p => p.descripcion?.toLowerCase().includes(q)).slice(0, 5);
    }
    return [];
  }, [busquedaCodigo, busquedaNombre, productos, codigoEscaneado]);

  const total = useMemo(() => venta.reduce((sum, item) => sum + item.precio * item.cantidad, 0), [venta]);

  const pagoTotalMXN = useMemo(() => {
    if (modoPago === 'PESOS')   return Number(pagoCliente) || 0;
    if (modoPago === 'DOLARES') return (Number(pagoDolares) || 0) * tasaCambio;
    if (modoPago === 'TARJETA') return total;
    if (modoPago === 'MIXTO')   return (Number(pagoMixtoPesos) || 0) + (Number(pagoMixtoDolares) || 0) * tasaCambio;
    return 0;
  }, [modoPago, pagoCliente, pagoDolares, pagoMixtoPesos, pagoMixtoDolares, tasaCambio, total]);

  const cambio = useMemo(() => Math.max(pagoTotalMXN - total, 0), [pagoTotalMXN, total]);

  // Productos en carrito con inventario insuficiente
  const productosConInventarioInsuficiente = useMemo(() => {
    return venta.filter(item => item.cantidad > (item.stock ?? 0));
  }, [venta]);

  // Sin restricción de inventario: se puede agregar aunque el inventario sea 0 o negativo
  const agregarAlCarrito = useCallback((producto) => {
    setVenta((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) return prev.map((i) => i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, {
        id: producto.id,
        descripcion: producto.descripcion,
        codigo: producto.codigo,
        precio: producto.precio,
        cantidad: 1,
        stock: producto.cantidad ?? 0,
      }];
    });
    setBusquedaCodigo(''); setBusquedaNombre(''); setCodigoEscaneado('');
  }, []);

  const quitarDelCarrito = useCallback((id) => setVenta(prev => prev.filter(item => item.id !== id)), []);

  const cambiarCantidad = useCallback((id, nuevaCantidadRaw) => {
    if (nuevaCantidadRaw === '' || nuevaCantidadRaw === '0') {
      setVenta((prev) => prev.map((item) =>
        item.id === id ? { ...item, cantidadRaw: nuevaCantidadRaw, cantidad: item.cantidad } : item
      ));
      return;
    }
    const nuevaCantidad = parseInt(nuevaCantidadRaw, 10);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) return;
    setVenta((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      return { ...item, cantidad: nuevaCantidad, cantidadRaw: String(nuevaCantidad) };
    }));
  }, []);

  const aplicarDenominacion = useCallback((monto) => setPagoCliente(String(monto.toFixed(2))), []);

  const limpiarVenta = useCallback(() => {
    setVenta([]); setModoPrestamo(false); setCuentaSeleccionada(null);
    setBusquedaCuenta(''); setBusquedaCodigo(''); setBusquedaNombre('');
    setCodigoEscaneado(''); setPagoCliente(''); setPagoDolares('');
    setPayoMixtoPesos(''); setPagoMixtoDolares(''); setModoPago('PESOS');
    setMostrarConfirmacion(false);
  }, []);

  const validarVenta = () => {
    if (venta.length === 0) { alert('El carrito está vacío'); return false; }
    if (modoPrestamo && !cuentaSeleccionada) { alert('Selecciona el cliente para el fiado'); return false; }
    if (!modoPrestamo && modoPago !== 'TARJETA' && pagoTotalMXN < total) { alert('El pago no cubre el total'); return false; }
    return true;
  };

  const handleCobrar = () => { if (!validarVenta()) return; setMostrarConfirmacion(true); };

  const confirmarVenta = async () => {
    setGuardando(true);
    try {
      // Paso 1: Ajustar inventario automáticamente para productos con cantidad insuficiente
      if (productosConInventarioInsuficiente.length > 0) {
        await Promise.all(
          productosConInventarioInsuficiente.map(item => {
            const faltante = item.cantidad - (item.stock ?? 0);
            return axios.post(`/api/productos/${item.id}/agregar-stock?cantidad=${faltante}&precioCompra=0`);
          })
        );
      }

      // Paso 2: Registrar la venta normalmente
      const ventaData = {
        fecha: new Date().toISOString(),
        cuentaId: modoPrestamo ? cuentaSeleccionada.id : null,
        total,
        status: modoPrestamo ? 'PRESTAMO' : 'COMPLETADA',
        pagoCliente: modoPrestamo ? null : pagoTotalMXN,
        tipoPago: modoPrestamo ? 'CREDITO' : modoPago,
        ventaProductos: venta.map(item => ({
          producto: { id: item.id, descripcion: item.descripcion },
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      };
      const respuesta = await axios.post('/api/ventas', ventaData);
      const ventaGuardada = respuesta.data;
      setMostrarConfirmacion(false);
      if (window.confirm('¿Imprimir ticket?')) {
        imprimirTicketVenta(ventaGuardada.id, {
          infoPago: { modoPago, tasaCambio, pagoDolares, pagoMixtoPesos, pagoMixtoDolares }
        });
      }
      limpiarVenta();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['cuentas-prestamo'] }),
        queryClient.invalidateQueries({ queryKey: ['resumen-dia'] }),
      ]);
    } catch (err) {
      alert('❌ Error al guardar venta: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading) return <div className="fs-4 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-4 text-center py-5">Error: {error.message}</div>;

  return (
    <>
      {/* MODAL CONFIRMACIÓN */}
      {mostrarConfirmacion && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className={`modal-header text-white ${modoPrestamo ? 'bg-warning' : 'bg-success'}`}>
                <h4 className="modal-title fw-bold">
                  {modoPrestamo ? '📋 Confirmar Fiado' : '✅ Confirmar Cobro'}
                </h4>
              </div>
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div className="text-muted mb-1 fs-5">Total a cobrar</div>
                  <div className="display-4 fw-bold text-success">{formatMoney(total)}</div>
                </div>
                <div className="list-group list-group-flush mb-3">
                  <div className="list-group-item d-flex justify-content-between px-0 py-3">
                    <span className="text-muted fs-5">Productos</span>
                    <span className="fw-semibold fs-5">{venta.length} artículo{venta.length !== 1 ? 's' : ''}</span>
                  </div>
                  {modoPrestamo ? (
                    <div className="list-group-item d-flex justify-content-between px-0 py-3">
                      <span className="text-muted fs-5">Cliente (fiado)</span>
                      <span className="fw-semibold fs-5 text-warning">{cuentaSeleccionada?.nombre}</span>
                    </div>
                  ) : (
                    <>
                      <div className="list-group-item d-flex justify-content-between px-0 py-3">
                        <span className="text-muted fs-5">Forma de pago</span>
                        <span className="fw-semibold fs-5">{ETIQUETA_MODO_PAGO[modoPago] || modoPago}</span>
                      </div>
                      {modoPago !== 'TARJETA' && (
                        <div className="list-group-item d-flex justify-content-between px-0 py-3">
                          <span className="text-muted fs-5">Pago recibido</span>
                          <span className="fw-semibold fs-5">{formatMoney(pagoTotalMXN)}</span>
                        </div>
                      )}
                      {modoPago !== 'TARJETA' && cambio > 0 && (
                        <div className="list-group-item d-flex justify-content-between px-0 py-2 bg-success-subtle rounded">
                          <span className="fw-bold text-success fs-5">💵 Cambio</span>
                          <span className="fw-bold fs-3 text-success">{formatMoney(cambio)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ALERTA INVENTARIO INSUFICIENTE — no bloqueante, solo informativa */}
                {productosConInventarioInsuficiente.length > 0 && (
                  <div className="alert alert-warning mb-0 mt-2" role="alert">
                    <div className="fw-bold mb-1">⚠️ Inventario insuficiente detectado</div>
                    <p className="mb-2" style={{ fontSize: '0.9rem' }}>
                      Los siguientes productos no tienen suficiente inventario registrado.
                      Al confirmar, el sistema <strong>agregará automáticamente</strong> lo
                      faltante al inventario para cubrir esta venta:
                    </p>
                    <ul className="mb-0 ps-3" style={{ fontSize: '0.88rem' }}>
                      {productosConInventarioInsuficiente.map(item => {
                        const faltante = item.cantidad - (item.stock ?? 0);
                        return (
                          <li key={item.id}>
                            <strong>{item.descripcion}</strong> — inventario actual:{' '}
                            <span className="text-danger fw-bold">{item.stock ?? 0}</span>,
                            cantidad a vender:{' '}
                            <span className="fw-bold">{item.cantidad}</span>,
                            se agregarán:{' '}
                            <span className="text-success fw-bold">+{faltante}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 pt-0 gap-2">
                <button className="btn btn-outline-secondary btn-lg flex-fill" onClick={() => setMostrarConfirmacion(false)} disabled={guardando}>
                  ✏️ Corregir
                </button>
                <button
                  className={`btn btn-lg flex-fill fw-bold text-white ${modoPrestamo ? 'btn-warning' : 'btn-success'}`}
                  onClick={confirmarVenta} disabled={guardando}
                >
                  {guardando
                    ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                    : modoPrestamo ? '📋 Registrar Fiado' : '✅ Cobrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LAYOUT PRINCIPAL */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden',
        padding: '8px 16px',
        gap: '8px',
      }}>

        {/* HEADER */}
        <div
          className="rounded px-3 py-2 text-white d-flex align-items-center justify-content-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)', minHeight: '52px' }}
        >
          <div className="d-flex align-items-center gap-3">
            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>🛒</span>
            <div>
              <div className="fw-bold" style={{ fontSize: '1.1rem', lineHeight: 1 }}>Punto de Venta</div>
              <div className="opacity-75" style={{ fontSize: '0.8rem' }}>
                {venta.length} producto{venta.length !== 1 ? 's' : ''} en carrito
                {codigoEscaneado && <span className="ms-2 badge bg-warning text-dark">🔢 Escaneando...</span>}
              </div>
            </div>
          </div>
          <div className="text-end">
            <div className="fw-bold text-warning" style={{ fontSize: '2rem', lineHeight: 1 }}>{formatMoney(total)}</div>
            <div className="opacity-75" style={{ fontSize: '0.75rem' }}>{modoPrestamo ? 'Por cobrar (fiado)' : 'Total'}</div>
          </div>
        </div>

        {/* CUERPO */}
        <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>

          {/* COLUMNA IZQUIERDA */}
          <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
            <ProductoSearch
              busquedaCodigo={busquedaCodigo}
              setBusquedaCodigo={setBusquedaCodigo}
              busquedaNombre={busquedaNombre}
              setBusquedaNombre={setBusquedaNombre}
              productosFiltrados={productosFiltrados}
              manejarSeleccionProducto={agregarAlCarrito}
              formatMoney={formatMoney}
              codigoEscaneado={codigoEscaneado}
              productos={productos}
            />
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <VentaTabla
                carrito={venta}
                formatMoney={formatMoney}
                cambiarCantidad={cambiarCantidad}
                quitarDelCarrito={quitarDelCarrito}
                pageSize={pageSize}
              />
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div style={{
            flex: '0 0 380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: 0,
          }}>
            {/* TOTAL + BOTONES — fijos arriba, fuera del scroll */}
            <div style={{ flexShrink: 0 }}>
              <div
                className={`rounded p-3 mb-2 text-center ${modoPrestamo ? 'bg-warning-subtle border border-warning' : 'bg-success-subtle border border-success'}`}
              >
                <div className={`fw-bold mb-1 ${modoPrestamo ? 'text-warning' : 'text-success'}`} style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {modoPrestamo ? '📋 Total Fiado' : '💵 Total a Cobrar'}
                </div>
                <div className={`fw-bold ${modoPrestamo ? 'text-warning' : 'text-success'}`} style={{ fontSize: '2.6rem', lineHeight: 1 }}>
                  {formatMoney(total)}
                </div>
                {!modoPrestamo && cambio > 0 && (
                  <div className="mt-2 text-success fw-semibold" style={{ fontSize: '1.1rem' }}>
                    💵 Cambio: {formatMoney(cambio)}
                  </div>
                )}
                <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                  {venta.length} artículo{venta.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary fw-bold"
                  style={{ height: '60px', minWidth: '110px', fontSize: '1rem' }}
                  onClick={limpiarVenta}
                >
                  <i className="bi bi-arrow-repeat me-1" />Limpiar
                </button>
                <button
                  className={`btn fw-bold flex-fill text-white ${
                    venta.length === 0 || (modoPrestamo && !cuentaSeleccionada)
                      ? 'btn-secondary'
                      : modoPrestamo ? 'btn-warning' : 'btn-success'
                  }`}
                  style={{ height: '60px', fontSize: '1.35rem' }}
                  onClick={handleCobrar}
                  disabled={venta.length === 0 || (modoPrestamo && !cuentaSeleccionada)}
                >
                  <i className={`bi me-2 ${modoPrestamo ? 'bi-person-check-fill' : 'bi-check-circle-fill'}`} />
                  {modoPrestamo ? 'Fiado' : 'Cobrar'}
                </button>
              </div>
            </div>

            {/* SECCIÓN SCROLLEABLE: modo pago + cobro/préstamo */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <ModoPago modoPrestamo={modoPrestamo} setModoPrestamo={setModoPrestamo} />

              {modoPrestamo ? (
                <CuentaPrestamo
                  cuentas={cuentas}
                  cuentaSeleccionada={cuentaSeleccionada}
                  setCuentaSeleccionada={setCuentaSeleccionada}
                  busquedaCuenta={busquedaCuenta}
                  setBusquedaCuenta={setBusquedaCuenta}
                  formatMoney={formatMoney}
                  cuentaData={cuentaSeleccionadaData}
                />
              ) : (
                <CobroContado
                  pagoCliente={pagoCliente}
                  setPagoCliente={setPagoCliente}
                  cambio={cambio}
                  formatMoney={formatMoney}
                  DENOMINACIONES={DENOMINACIONES}
                  aplicarDenominacion={aplicarDenominacion}
                  total={total}
                  modoPago={modoPago}
                  setModoPago={setModoPago}
                  pagoDolares={pagoDolares}
                  setPagoDolares={setPagoDolares}
                  pagoMixtoPesos={pagoMixtoPesos}
                  setPayoMixtoPesos={setPayoMixtoPesos}
                  pagoMixtoDolares={pagoMixtoDolares}
                  setPagoMixtoDolares={setPagoMixtoDolares}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
