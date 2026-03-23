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
  MIXTO:   '🔀 Mixto (pesos + dólares + tarjeta)',
};

// Estado vacío de cobro — reutilizable para venta principal y split
const COBRO_INICIAL = {
  modoPago: 'PESOS',
  modoPrestamo: false,
  cuentaSeleccionada: null,
  busquedaCuenta: '',
  pagoCliente: '',
  pagoDolares: '',
  pagoMixtoPesos: '',
  pagoMixtoDolares: '',
  pagoMixtoTarjeta: '',
};

export default function Venta() {
  const [venta, setVenta] = useState([]);
  const [busquedaCodigo, setBusquedaCodigo] = useState('');
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [pageSize] = useState(20);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Cobro principal
  const [cobro, setCobro] = useState(COBRO_INICIAL);
  const setCobVal = (key, val) => setCobro(prev => ({ ...prev, [key]: val }));

  // ── SPLIT ────────────────────────────────────────────────────────────────────
  const [modoSplit, setModoSplit] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [mostrarConfirmacionSplit, setMostrarConfirmacionSplit] = useState(false);
  const [guardandoSplit, setGuardandoSplit] = useState(false);
  const [cobroSplit, setCobroSplit] = useState(COBRO_INICIAL);
  const setSplitVal = (key, val) => setCobroSplit(prev => ({ ...prev, [key]: val }));
  // ─────────────────────────────────────────────────────────────────────────────

  const { tasaCambio } = useTasaCambio();
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
    enabled: cobro.modoPrestamo || cobroSplit.modoPrestamo,
  });

  const productos = Array.isArray(productosRaw) ? productosRaw : productosRaw?.content || [];
  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];

  // ── Escáner ──────────────────────────────────────────────────────────────────
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

  // ── Helpers carrito ──────────────────────────────────────────────────────────
  const cuentaSeleccionadaData = useMemo(() => {
    if (!cobro.cuentaSeleccionada?.id || !cuentas.length) return null;
    return cuentas.find(c => c.id === cobro.cuentaSeleccionada.id) || null;
  }, [cobro.cuentaSeleccionada?.id, cuentas]);

  const cuentaSplitData = useMemo(() => {
    if (!cobroSplit.cuentaSeleccionada?.id || !cuentas.length) return null;
    return cuentas.find(c => c.id === cobroSplit.cuentaSeleccionada.id) || null;
  }, [cobroSplit.cuentaSeleccionada?.id, cuentas]);

  const productosFiltrados = useMemo(() => {
    if (codigoEscaneado.length > 0 || (busquedaCodigo && busquedaCodigo.trim())) return [];
    if (busquedaNombre?.trim()) {
      const q = busquedaNombre.toLowerCase().trim();
      return productos.filter(p => p.descripcion?.toLowerCase().includes(q)).slice(0, 5);
    }
    return [];
  }, [busquedaCodigo, busquedaNombre, productos, codigoEscaneado]);

  const total = useMemo(() => venta.reduce((sum, i) => sum + i.precio * i.cantidad, 0), [venta]);

  // Ítems seleccionados para split
  const itemsSplit = useMemo(() => venta.filter(i => seleccionados.has(i.id)), [venta, seleccionados]);
  const totalSplit = useMemo(() => itemsSplit.reduce((s, i) => s + i.precio * i.cantidad, 0), [itemsSplit]);

  const calcPagoMXN = (c, tot) => {
    if (c.modoPago === 'PESOS')   return Number(c.pagoCliente) || 0;
    if (c.modoPago === 'DOLARES') return (Number(c.pagoDolares) || 0) * tasaCambio;
    if (c.modoPago === 'TARJETA') return tot;
    if (c.modoPago === 'MIXTO')   return (
      (Number(c.pagoMixtoPesos) || 0) +
      (Number(c.pagoMixtoDolares) || 0) * tasaCambio +
      (Number(c.pagoMixtoTarjeta) || 0)
    );
    return 0;
  };

  const pagoTotalMXN = useMemo(() => calcPagoMXN(cobro, total), [cobro, total, tasaCambio]);
  const pagoSplitMXN = useMemo(() => calcPagoMXN(cobroSplit, totalSplit), [cobroSplit, totalSplit, tasaCambio]);
  const cambio      = useMemo(() => Math.max(pagoTotalMXN - total, 0), [pagoTotalMXN, total]);
  const cambioSplit = useMemo(() => Math.max(pagoSplitMXN - totalSplit, 0), [pagoSplitMXN, totalSplit]);

  const productosConInventarioInsuficiente = useMemo(
    () => venta.filter(item => item.cantidad > (item.stock ?? 0)),
    [venta]
  );

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

  const quitarDelCarrito = useCallback((id) => {
    setVenta(prev => prev.filter(item => item.id !== id));
    setSeleccionados(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

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

  const toggleSeleccion = useCallback((id) => {
    setSeleccionados(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  const toggleTodosSeleccionados = useCallback(() => {
    setSeleccionados(prev =>
      prev.size === venta.length ? new Set() : new Set(venta.map(i => i.id))
    );
  }, [venta]);

  const cancelarSplit = useCallback(() => {
    setModoSplit(false);
    setSeleccionados(new Set());
    setCobroSplit(COBRO_INICIAL);
    setMostrarConfirmacionSplit(false);
  }, []);

  const limpiarVenta = useCallback(() => {
    setVenta([]);
    setCobro(COBRO_INICIAL);
    setBusquedaCodigo(''); setBusquedaNombre(''); setCodigoEscaneado('');
    setMostrarConfirmacion(false);
    cancelarSplit();
  }, [cancelarSplit]);

  // ── Validaciones ─────────────────────────────────────────────────────────────
  const validarCobro = (c, items, tot) => {
    if (items.length === 0) { alert('No hay productos seleccionados'); return false; }
    if (c.modoPrestamo && !c.cuentaSeleccionada) { alert('Selecciona el cliente para el fiado'); return false; }
    if (!c.modoPrestamo && c.modoPago !== 'TARJETA' && calcPagoMXN(c, tot) < tot) {
      alert('El pago no cubre el total'); return false;
    }
    return true;
  };

  const handleCobrar = () => {
    if (!validarCobro(cobro, venta, total)) return;
    setMostrarConfirmacion(true);
  };

  const handleCobrarSplit = () => {
    if (seleccionados.size === 0) { alert('Selecciona al menos un producto'); return; }
    if (!validarCobro(cobroSplit, itemsSplit, totalSplit)) return;
    setMostrarConfirmacionSplit(true);
  };

  // ── Confirmar venta genérica ─────────────────────────────────────────────────
  const ejecutarVenta = async (items, c, tot) => {
    const insuficientes = items.filter(item => item.cantidad > (item.stock ?? 0));
    if (insuficientes.length > 0) {
      await Promise.all(
        insuficientes.map(item => {
          const faltante = item.cantidad - (item.stock ?? 0);
          return axios.post(`/api/productos/${item.id}/agregar-stock?cantidad=${faltante}&precioCompra=0`);
        })
      );
    }
    const ventaData = {
      fecha: new Date().toISOString(),
      cuentaId: c.modoPrestamo ? c.cuentaSeleccionada.id : null,
      total: tot,
      status: c.modoPrestamo ? 'PRESTAMO' : 'COMPLETADA',
      pagoCliente: c.modoPrestamo ? null : calcPagoMXN(c, tot),
      tipoPago: c.modoPrestamo ? 'CREDITO' : c.modoPago,
      ventaProductos: items.map(item => ({
        producto: { id: item.id, descripcion: item.descripcion },
        cantidad: item.cantidad,
        precioUnitario: item.precio,
      })),
    };
    const respuesta = await axios.post('/api/ventas', ventaData);
    return { ventaGuardada: respuesta.data, infoCobro: c };
  };

  const confirmarVenta = async () => {
    setGuardando(true);
    try {
      const { ventaGuardada, infoCobro } = await ejecutarVenta(venta, cobro, total);
      setMostrarConfirmacion(false);
      if (window.confirm('¿Imprimir ticket?')) {
        imprimirTicketVenta(ventaGuardada.id, {
          infoPago: {
            modoPago: infoCobro.modoPago, tasaCambio,
            pagoDolares: infoCobro.pagoDolares,
            pagoMixtoPesos: infoCobro.pagoMixtoPesos,
            pagoMixtoDolares: infoCobro.pagoMixtoDolares,
            pagoMixtoTarjeta: infoCobro.pagoMixtoTarjeta,
          }
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

  const confirmarSplit = async () => {
    setGuardandoSplit(true);
    try {
      const { ventaGuardada, infoCobro } = await ejecutarVenta(itemsSplit, cobroSplit, totalSplit);
      setMostrarConfirmacionSplit(false);

      if (window.confirm('¿Imprimir ticket de esta parte?')) {
        imprimirTicketVenta(ventaGuardada.id, {
          infoPago: {
            modoPago: infoCobro.modoPago, tasaCambio,
            pagoDolares: infoCobro.pagoDolares,
            pagoMixtoPesos: infoCobro.pagoMixtoPesos,
            pagoMixtoDolares: infoCobro.pagoMixtoDolares,
            pagoMixtoTarjeta: infoCobro.pagoMixtoTarjeta,
          }
        });
      }

      // Quitar ítems cobrados del carrito principal
      const idsCobrados = new Set(itemsSplit.map(i => i.id));
      setVenta(prev => prev.filter(i => !idsCobrados.has(i.id)));
      setSeleccionados(new Set());
      setCobroSplit(COBRO_INICIAL);
      setModoSplit(false);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['cuentas-prestamo'] }),
        queryClient.invalidateQueries({ queryKey: ['resumen-dia'] }),
      ]);
    } catch (err) {
      alert('❌ Error al guardar split: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardandoSplit(false);
    }
  };

  if (isLoading) return <div className="fs-4 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-4 text-center py-5">Error: {error.message}</div>;

  // ── Modal reutilizable ───────────────────────────────────────────────────────
  const ModalConfirmacion = ({ items, c, tot, pago, cam, onConfirm, onCancel, guardandoFlag, titulo, colorClass }) => {
    const insuf = items.filter(item => item.cantidad > (item.stock ?? 0));
    return (
      <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow-lg border-0">
            <div className={`modal-header text-white ${colorClass}`}>
              <h4 className="modal-title fw-bold">{titulo}</h4>
            </div>
            <div className="modal-body p-4">
              <div className="text-center mb-4">
                <div className="text-muted mb-1 fs-5">Total a cobrar</div>
                <div className="display-4 fw-bold text-success">{formatMoney(tot)}</div>
              </div>
              <div className="list-group list-group-flush mb-3">
                <div className="list-group-item d-flex justify-content-between px-0 py-3">
                  <span className="text-muted fs-5">Productos</span>
                  <span className="fw-semibold fs-5">{items.length} artículo{items.length !== 1 ? 's' : ''}</span>
                </div>
                {c.modoPrestamo ? (
                  <div className="list-group-item d-flex justify-content-between px-0 py-3">
                    <span className="text-muted fs-5">Cliente (fiado)</span>
                    <span className="fw-semibold fs-5 text-warning">{c.cuentaSeleccionada?.nombre}</span>
                  </div>
                ) : (
                  <>
                    <div className="list-group-item d-flex justify-content-between px-0 py-3">
                      <span className="text-muted fs-5">Forma de pago</span>
                      <span className="fw-semibold fs-5">{ETIQUETA_MODO_PAGO[c.modoPago] || c.modoPago}</span>
                    </div>
                    {c.modoPago !== 'TARJETA' && (
                      <div className="list-group-item d-flex justify-content-between px-0 py-3">
                        <span className="text-muted fs-5">Pago recibido</span>
                        <span className="fw-semibold fs-5">{formatMoney(pago)}</span>
                      </div>
                    )}
                    {c.modoPago !== 'TARJETA' && cam >= 0 && pago > 0 && (
                      <div className="list-group-item d-flex justify-content-between px-0 py-2 bg-success-subtle rounded">
                        <span className="fw-bold text-success fs-5">💵 Cambio</span>
                        <span className="fw-bold fs-3 text-success">{formatMoney(cam)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {insuf.length > 0 && (
                <div className="alert alert-warning mb-0 mt-2">
                  <div className="fw-bold mb-1">⚠️ Inventario insuficiente</div>
                  <ul className="mb-0 ps-3" style={{ fontSize: '0.88rem' }}>
                    {insuf.map(item => {
                      const faltante = item.cantidad - (item.stock ?? 0);
                      return (
                        <li key={item.id}>
                          <strong>{item.descripcion}</strong> — stock: <span className="text-danger fw-bold">{item.stock ?? 0}</span>,
                          vender: <span className="fw-bold">{item.cantidad}</span>,
                          +<span className="text-success fw-bold">{faltante}</span> auto
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer border-0 pt-0 gap-2">
              <button className="btn btn-outline-secondary btn-lg flex-fill" onClick={onCancel} disabled={guardandoFlag}>✏️ Corregir</button>
              <button className={`btn btn-lg flex-fill fw-bold text-white ${colorClass}`} onClick={onConfirm} disabled={guardandoFlag}>
                {guardandoFlag
                  ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
                  : c.modoPrestamo ? '📋 Registrar Fiado' : '✅ Cobrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* MODAL CONFIRMACIÓN PRINCIPAL */}
      {mostrarConfirmacion && (
        <ModalConfirmacion
          items={venta} c={cobro} tot={total} pago={pagoTotalMXN} cam={cambio}
          onConfirm={confirmarVenta} onCancel={() => setMostrarConfirmacion(false)}
          guardandoFlag={guardando}
          titulo={cobro.modoPrestamo ? '📋 Confirmar Fiado' : '✅ Confirmar Cobro'}
          colorClass={cobro.modoPrestamo ? 'bg-warning' : 'bg-success'}
        />
      )}

      {/* MODAL CONFIRMACIÓN SPLIT */}
      {mostrarConfirmacionSplit && (
        <ModalConfirmacion
          items={itemsSplit} c={cobroSplit} tot={totalSplit} pago={pagoSplitMXN} cam={cambioSplit}
          onConfirm={confirmarSplit} onCancel={() => setMostrarConfirmacionSplit(false)}
          guardandoFlag={guardandoSplit}
          titulo={`✂️ Cobrar selección (${seleccionados.size} ítem${seleccionados.size !== 1 ? 's' : ''})`}
          colorClass={cobroSplit.modoPrestamo ? 'bg-warning' : 'bg-info'}
        />
      )}

      {/* LAYOUT PRINCIPAL */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 60px)', overflow: 'hidden',
        padding: '8px 16px', gap: '8px',
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
                {modoSplit && <span className="ms-2 badge bg-info text-white">✂️ Modo split activo</span>}
              </div>
            </div>
          </div>
          <div className="text-end">
            <div className="fw-bold text-warning" style={{ fontSize: '2rem', lineHeight: 1 }}>{formatMoney(total)}</div>
            <div className="opacity-75" style={{ fontSize: '0.75rem' }}>{cobro.modoPrestamo ? 'Por cobrar (fiado)' : 'Total'}</div>
          </div>
        </div>

        {/* CUERPO */}
        <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>

          {/* COLUMNA IZQUIERDA */}
          <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
            <ProductoSearch
              busquedaCodigo={busquedaCodigo} setBusquedaCodigo={setBusquedaCodigo}
              busquedaNombre={busquedaNombre} setBusquedaNombre={setBusquedaNombre}
              productosFiltrados={productosFiltrados}
              manejarSeleccionProducto={agregarAlCarrito}
              formatMoney={formatMoney}
              codigoEscaneado={codigoEscaneado}
              productos={productos}
            />

            {/* BARRA SPLIT */}
            {venta.length > 0 && (
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                {!modoSplit ? (
                  <button
                    className="btn btn-outline-info btn-sm fw-semibold"
                    onClick={() => setModoSplit(true)}
                    title="Separar cobro: selecciona ítems para cobrarlos con distinto método de pago o cliente"
                  >
                    ✂️ Separar cobro
                  </button>
                ) : (
                  <>
                    <button className="btn btn-outline-secondary btn-sm" onClick={cancelarSplit}>✕ Cancelar split</button>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={toggleTodosSeleccionados}
                    >
                      {seleccionados.size === venta.length ? '☐ Deseleccionar todo' : '☑ Seleccionar todo'}
                    </button>
                    {seleccionados.size > 0 && (
                      <span className="ms-auto badge bg-warning text-dark fs-6 px-3 py-2">
                        ✂️ Selección: {formatMoney(totalSplit)}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <VentaTabla
                carrito={venta}
                formatMoney={formatMoney}
                cambiarCantidad={cambiarCantidad}
                quitarDelCarrito={quitarDelCarrito}
                pageSize={pageSize}
                modoSplit={modoSplit}
                seleccionados={seleccionados}
                toggleSeleccion={toggleSeleccion}
              />
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>

            {/* ── Panel SPLIT ─────────────────────────────────────────────────── */}
            {modoSplit && seleccionados.size > 0 && (
              <div className="card border-info shadow-sm flex-shrink-0" style={{ background: '#f0fbff' }}>
                <div className="card-header bg-info text-white fw-bold py-2 d-flex justify-content-between">
                  <span>✂️ Cobrar selección — {formatMoney(totalSplit)}</span>
                  <span className="opacity-75" style={{ fontSize: '0.85rem' }}>{seleccionados.size} ítem{seleccionados.size !== 1 ? 's' : ''}</span>
                </div>
                {/* FIX: sin maxHeight para que el botón de cobrar siempre sea visible */}
                <div className="card-body p-2" style={{ overflowY: 'auto' }}>
                  <ModoPago
                    modoPrestamo={cobroSplit.modoPrestamo}
                    setModoPrestamo={(v) => setSplitVal('modoPrestamo', v)}
                  />
                  {cobroSplit.modoPrestamo ? (
                    <CuentaPrestamo
                      cuentas={cuentas}
                      cuentaSeleccionada={cobroSplit.cuentaSeleccionada}
                      setCuentaSeleccionada={(v) => setSplitVal('cuentaSeleccionada', v)}
                      busquedaCuenta={cobroSplit.busquedaCuenta}
                      setBusquedaCuenta={(v) => setSplitVal('busquedaCuenta', v)}
                      formatMoney={formatMoney}
                      cuentaData={cuentaSplitData}
                    />
                  ) : (
                    <CobroContado
                      pagoCliente={cobroSplit.pagoCliente}
                      setPagoCliente={(v) => setSplitVal('pagoCliente', v)}
                      cambio={cambioSplit}
                      formatMoney={formatMoney}
                      DENOMINACIONES={DENOMINACIONES}
                      aplicarDenominacion={(m) => setSplitVal('pagoCliente', String(m.toFixed(2)))}
                      total={totalSplit}
                      modoPago={cobroSplit.modoPago}
                      setModoPago={(v) => setSplitVal('modoPago', v)}
                      pagoDolares={cobroSplit.pagoDolares}
                      setPagoDolares={(v) => setSplitVal('pagoDolares', v)}
                      pagoMixtoPesos={cobroSplit.pagoMixtoPesos}
                      setPayoMixtoPesos={(v) => setSplitVal('pagoMixtoPesos', v)}
                      pagoMixtoDolares={cobroSplit.pagoMixtoDolares}
                      setPagoMixtoDolares={(v) => setSplitVal('pagoMixtoDolares', v)}
                      pagoMixtoTarjeta={cobroSplit.pagoMixtoTarjeta}
                      setPagoMixtoTarjeta={(v) => setSplitVal('pagoMixtoTarjeta', v)}
                    />
                  )}
                </div>
                {/* FIX: botón fuera del área scrolleable en card-footer para siempre ser visible */}
                <div className="card-footer p-2 bg-transparent border-top-0">
                  <button
                    className="btn btn-info text-white fw-bold w-100"
                    style={{ fontSize: '1.1rem', height: 48 }}
                    onClick={handleCobrarSplit}
                  >
                    ✂️ Cobrar {formatMoney(totalSplit)} por separado
                  </button>
                </div>
              </div>
            )}

            {/* ── Cobro principal ──────────────────────────────────────────────── */}
            <div style={{ flexShrink: 0 }}>
              <div className={`rounded p-3 mb-2 text-center ${
                cobro.modoPrestamo ? 'bg-warning-subtle border border-warning' : 'bg-success-subtle border border-success'
              }`}>
                <div className={`fw-bold mb-1 ${cobro.modoPrestamo ? 'text-warning' : 'text-success'}`}
                  style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {cobro.modoPrestamo ? '📋 Total Fiado' : '💵 Total a Cobrar'}
                  {modoSplit && seleccionados.size > 0 && (
                    <span className="ms-2 text-muted fw-normal" style={{ fontSize: '0.8rem' }}>(restante)</span>
                  )}
                </div>
                <div className={`fw-bold ${cobro.modoPrestamo ? 'text-warning' : 'text-success'}`}
                  style={{ fontSize: '2.6rem', lineHeight: 1 }}>
                  {formatMoney(modoSplit && seleccionados.size > 0 ? total - totalSplit : total)}
                </div>
                {!cobro.modoPrestamo && cambio >= 0 && pagoTotalMXN > 0 && (
                  <div className="mt-2 text-success fw-semibold" style={{ fontSize: '1.1rem' }}>💵 Cambio: {formatMoney(cambio)}</div>
                )}
                <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>
                  {modoSplit && seleccionados.size > 0
                    ? `${venta.length - seleccionados.size} artículo${(venta.length - seleccionados.size) !== 1 ? 's' : ''} restantes`
                    : `${venta.length} artículo${venta.length !== 1 ? 's' : ''}`}
                </div>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary fw-bold" style={{ height: '60px', minWidth: '110px', fontSize: '1rem' }} onClick={limpiarVenta}>
                  <i className="bi bi-arrow-repeat me-1" />Limpiar
                </button>
                <button
                  className={`btn fw-bold flex-fill text-white ${
                    venta.length === 0 || (cobro.modoPrestamo && !cobro.cuentaSeleccionada)
                      ? 'btn-secondary'
                      : cobro.modoPrestamo ? 'btn-warning' : 'btn-success'
                  }`}
                  style={{ height: '60px', fontSize: '1.35rem' }}
                  onClick={handleCobrar}
                  disabled={venta.length === 0 || (cobro.modoPrestamo && !cobro.cuentaSeleccionada)}
                >
                  <i className={`bi me-2 ${cobro.modoPrestamo ? 'bi-person-check-fill' : 'bi-check-circle-fill'}`} />
                  {modoSplit && seleccionados.size > 0
                    ? (cobro.modoPrestamo ? 'Fiado restante' : 'Cobrar restante')
                    : (cobro.modoPrestamo ? 'Fiado' : 'Cobrar')}
                </button>
              </div>
            </div>

            {/* Cobro principal — scroll */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <ModoPago modoPrestamo={cobro.modoPrestamo} setModoPrestamo={(v) => setCobVal('modoPrestamo', v)} />
              {cobro.modoPrestamo ? (
                <CuentaPrestamo
                  cuentas={cuentas}
                  cuentaSeleccionada={cobro.cuentaSeleccionada}
                  setCuentaSeleccionada={(v) => setCobVal('cuentaSeleccionada', v)}
                  busquedaCuenta={cobro.busquedaCuenta}
                  setBusquedaCuenta={(v) => setCobVal('busquedaCuenta', v)}
                  formatMoney={formatMoney}
                  cuentaData={cuentaSeleccionadaData}
                />
              ) : (
                <CobroContado
                  pagoCliente={cobro.pagoCliente}
                  setPagoCliente={(v) => setCobVal('pagoCliente', v)}
                  cambio={cambio}
                  formatMoney={formatMoney}
                  DENOMINACIONES={DENOMINACIONES}
                  aplicarDenominacion={(m) => setCobVal('pagoCliente', String(m.toFixed(2)))}
                  total={total}
                  modoPago={cobro.modoPago}
                  setModoPago={(v) => setCobVal('modoPago', v)}
                  pagoDolares={cobro.pagoDolares}
                  setPagoDolares={(v) => setCobVal('pagoDolares', v)}
                  pagoMixtoPesos={cobro.pagoMixtoPesos}
                  setPayoMixtoPesos={(v) => setCobVal('pagoMixtoPesos', v)}
                  pagoMixtoDolares={cobro.pagoMixtoDolares}
                  setPagoMixtoDolares={(v) => setCobVal('pagoMixtoDolares', v)}
                  pagoMixtoTarjeta={cobro.pagoMixtoTarjeta}
                  setPagoMixtoTarjeta={(v) => setCobVal('pagoMixtoTarjeta', v)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
