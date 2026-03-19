import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';
import ProductoSearchMerma from './ProductoSearchMerma';
import MermaTabla from './MermaTabla';
import ResumenMerma from './ResumenMerma';

export default function Merma() {
  const queryClient = useQueryClient();
  const [itemsMerma, setItemsMerma] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [tipoMerma, setTipoMerma] = useState('CADUCADO');
  const [descripcionMerma, setDescripcionMerma] = useState('');
  const [costoEstimado, setCostoEstimado] = useState(0);
  const [costoCargando, setCostoCargando] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [showReporte, setShowReporte] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));

  const inputBusquedaRef = useRef(null);
  const costoTimeoutRef = useRef(null);

  useEffect(() => {
    setItemsMerma([]);
    setBusqueda('');
    setDescripcionMerma('');
    setCostoEstimado(0);
    setShowReporte(false);
    setCodigoEscaneado('');
    queryClient.invalidateQueries(['productos-merma']);
    const timer = setTimeout(() => inputBusquedaRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: async () => {
      const response = await axios.get('/api/productos');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalItems = useMemo(() =>
    Array.isArray(itemsMerma)
      ? itemsMerma.reduce((sum, i) => sum + (i?.cantidad || 0), 0)
      : 0
  , [itemsMerma]);

  const agregarItemMerma = useCallback((producto) => {
    if (!producto) return;
    setItemsMerma(prev => {
      const prevSeguro = Array.isArray(prev) ? prev : [];
      const existe = prevSeguro.find(i => i?.id === producto.id);
      const inventario = producto.cantidad ?? 0;
      if (inventario <= 0) {
        alert(`\u274c Sin inventario: ${producto.descripcion || 'Producto sin nombre'}`);
        return prevSeguro;
      }
      if (existe) {
        const nuevaCant = Math.min((existe.cantidad || 0) + 1, inventario);
        return prevSeguro.map(i => i?.id === producto.id ? { ...i, cantidad: nuevaCant } : i);
      }
      return [...prevSeguro, { ...producto, cantidad: 1, inventario }];
    });
    setBusqueda('');
    setCodigoEscaneado('');
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  }, []);

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
          const producto = Array.isArray(productos)
            ? productos.find(p => (p?.codigo || '').toString().trim() === codigo)
            : null;
          if (producto) { agregarItemMerma(producto); }
          else { alert(`C\u00f3digo "${codigo}" no encontrado`); }
          bufferEscaner.current = ''; escaneando = false; setCodigoEscaneado(''); clearTimeout(timerEscaner); timerEscaner = null;
        }
        return;
      }
      if (!/^[0-9]$/.test(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (!escaneando) { escaneando = true; bufferEscaner.current = ''; setCodigoEscaneado(''); }
      bufferEscaner.current += e.key;
      setCodigoEscaneado(bufferEscaner.current);
      clearTimeout(timerEscaner);
      timerEscaner = setTimeout(() => { bufferEscaner.current = ''; escaneando = false; setCodigoEscaneado(''); }, 500);
    };
    window.addEventListener('keydown', handleEscaneo, true);
    return () => window.removeEventListener('keydown', handleEscaneo, true);
  }, [productos, agregarItemMerma]);

  const productosFiltrados = useMemo(() => {
    if (!Array.isArray(productos) || codigoEscaneado.length > 0) return [];
    return productos
      .filter(p =>
        (p?.descripcion || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (p?.codigo || '').toLowerCase().includes(busqueda.toLowerCase())
      )
      .filter(p => (p?.cantidad || 0) > 0)
      .slice(0, 10);
  }, [productos, busqueda, codigoEscaneado]);

  const { data: reporteMermas = [], isFetching: loadingReporte } = useQuery({
    queryKey: ['reporte-mermas', fechaDesde, fechaHasta],
    queryFn: async () => {
      const params = { desde: `${fechaDesde}T00:00:00`, hasta: `${fechaHasta}T23:59:59` };
      const res = await axios.get('/api/mermas/reporte', { params });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: showReporte,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (costoTimeoutRef.current) clearTimeout(costoTimeoutRef.current);
    if (!Array.isArray(itemsMerma) || itemsMerma.length === 0) {
      setCostoEstimado(0);
      return;
    }
    costoTimeoutRef.current = setTimeout(async () => {
      setCostoCargando(true);
      try {
        const requests = itemsMerma
          .filter(item => item?.id && Number.isInteger(item.cantidad) && item.cantidad > 0)
          .map(item => ({ productoId: item.id, cantidad: item.cantidad }));
        if (requests.length === 0) { setCostoEstimado(0); setCostoCargando(false); return; }
        const res = await axios.post('/api/mermas/costos-batch', requests);
        const total = Array.isArray(res.data)
          ? res.data.reduce((sum, costo) => sum + (typeof costo === 'number' ? costo : 0), 0)
          : 0;
        setCostoEstimado(total);
      } catch (err) {
        console.error('\u274c costos-batch fall\u00f3:', err.response?.status, err.response?.data || err.message);
        const fallback = itemsMerma.reduce((sum, item) => {
          const precio = item?.precioVenta || item?.precio || 0;
          return sum + (precio * (item?.cantidad || 0));
        }, 0);
        setCostoEstimado(fallback);
      } finally {
        setCostoCargando(false);
      }
    }, 500);
    return () => { if (costoTimeoutRef.current) clearTimeout(costoTimeoutRef.current); };
  }, [itemsMerma]);

  const quitarItem = useCallback((id) => {
    if (!id) return;
    setItemsMerma(prev => Array.isArray(prev) ? prev.filter(i => i?.id !== id) : []);
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  }, []);

  const cambiarCantidadItem = useCallback((id, nuevaCantidadRaw) => {
    if (!id) return;
    if (nuevaCantidadRaw === '' || nuevaCantidadRaw === '0') {
      setItemsMerma(prev =>
        Array.isArray(prev)
          ? prev.map(i => i?.id === id ? { ...i, cantidadRaw: nuevaCantidadRaw } : i)
          : []
      );
      return;
    }
    const nuevaCantidad = parseInt(nuevaCantidadRaw, 10);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) return;
    setItemsMerma(prev =>
      Array.isArray(prev)
        ? prev.map(i => {
            if (i?.id !== id) return i;
            const cantidadFinal = Math.min(nuevaCantidad, i?.inventario ?? 0);
            return { ...i, cantidad: cantidadFinal, cantidadRaw: String(cantidadFinal) };
          })
        : []
    );
  }, []);

  const guardarMerma = async () => {
    if (!Array.isArray(itemsMerma) || itemsMerma.length === 0) return alert('\u274c Carrito vac\u00edo');
    const conExceso = itemsMerma.find(i => (i?.cantidad || 0) > (i?.inventario ?? 0));
    if (conExceso) return alert(`\u274c Excede inventario: ${conExceso.descripcion || 'Producto sin nombre'}`);
    try {
      const mermaData = {
        tipoMerma,
        motivoGeneral: descripcionMerma?.trim() || null,
        mermaProductos: itemsMerma
          .filter(item => item?.id)
          .map(item => ({ producto: { id: item.id }, cantidad: item.cantidad || 0 }))
      };
      const res = await axios.post('/api/mermas', mermaData);
      const costoTotalReal = res.data?.costoTotal ?? 0;
      alert(`\u2705 Merma guardada\n\ud83d\udcb0 Costo: ${formatMoney(costoTotalReal)}`);
      setItemsMerma([]);
      setDescripcionMerma('');
      setBusqueda('');
      setCostoEstimado(0);
      setCodigoEscaneado('');
      queryClient.invalidateQueries(['productos-merma']);
      setTimeout(() => inputBusquedaRef.current?.focus(), 50);
    } catch (err) {
      alert(`\u274c ${err.response?.data?.message || err.response?.data || 'Error al guardar merma'}`);
    }
  };

  const limpiar = () => {
    setItemsMerma([]);
    setDescripcionMerma('');
    setBusqueda('');
    setCodigoEscaneado('');
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  };

  const labelTipo = (t) =>
    t === 'CADUCADO' ? 'Caducado' :
    t === 'USO_PERSONAL' ? 'Uso Personal' :
    t === 'MAL_ESTADO' ? 'Mal Estado' :
    t === 'ROBO' ? 'Robo' : 'Otro';

  const badgeTipo = (t) =>
    t === 'CADUCADO' ? 'bg-warning text-dark' :
    t === 'USO_PERSONAL' ? 'bg-info text-dark' :
    t === 'MAL_ESTADO' ? 'bg-secondary' :
    t === 'ROBO' ? 'bg-dark' : 'bg-primary';

  if (isLoading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
      <div className="spinner-border text-danger me-3" />
      <span className="fs-5">Cargando productos...</span>
    </div>
  );
  if (error) return (
    <div className="alert alert-danger m-3">
      <i className="bi bi-exclamation-triangle-fill me-2" />
      Error cargando productos: {error.message}
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* HEADER */}
      <div className="bg-danger text-white px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0" style={{ minHeight: 54 }}>
        <div>
          <h5 className="mb-0 fw-bold">📦 Registro de Merma</h5>
          <small className="opacity-75">
            {totalItems > 0
              ? `${itemsMerma.length} producto(s) \u00b7 ${totalItems} unidades \u00b7 ${costoCargando ? 'Calculando...' : formatMoney(costoEstimado)}`
              : 'Agrega productos para registrar merma'}
          </small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {costoCargando && <div className="spinner-border spinner-border-sm text-warning" />}
          <button
            className={`btn fw-bold ${showReporte ? 'btn-light' : 'btn-outline-light'}`}
            onClick={() => setShowReporte(!showReporte)}
          >
            <i className="bi bi-graph-up me-2" />{showReporte ? 'Ocultar reporte' : 'Ver reporte'}
          </button>
        </div>
      </div>

      {/* CUERPO */}
      <div className="flex-fill overflow-auto p-3">
        <div className="row g-3">
          <div className="col-lg-8">
            <ProductoSearchMerma
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              tipoMerma={tipoMerma}
              setTipoMerma={setTipoMerma}
              descripcionMerma={descripcionMerma}
              setDescripcionMerma={setDescripcionMerma}
              inputBusquedaRef={inputBusquedaRef}
              productosFiltrados={productosFiltrados}
              agregarItemMerma={agregarItemMerma}
              formatMoney={formatMoney}
              codigoEscaneado={codigoEscaneado}
            />
            <MermaTabla
              itemsMerma={itemsMerma}
              cambiarCantidadItem={cambiarCantidadItem}
              quitarItem={quitarItem}
              pageSize={pageSize}
              setPageSize={setPageSize}
              formatMoney={formatMoney}
            />
          </div>

          <div className="col-lg-4">
            <ResumenMerma
              totalItems={totalItems}
              costoEstimado={costoEstimado}
              costoCargando={costoCargando}
              tipoMerma={tipoMerma}
              labelTipo={labelTipo}
              badgeTipo={badgeTipo}
              formatMoney={formatMoney}
            />

            {showReporte && (
              <div className="card shadow-sm border-info mt-3">
                <div className="card-header bg-info bg-opacity-10 py-2">
                  <div className="fw-semibold small mb-2">
                    <i className="bi bi-calendar-range me-1" /> Filtrar por fecha
                  </div>
                  <div className="row g-1">
                    <div className="col-6">
                      <label className="form-label mb-1 text-muted" style={{ fontSize: '0.7rem' }}>Desde</label>
                      <input type="date" className="form-control form-control-sm"
                        value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                    </div>
                    <div className="col-6">
                      <label className="form-label mb-1 text-muted" style={{ fontSize: '0.7rem' }}>Hasta</label>
                      <input type="date" className="form-control form-control-sm"
                        value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="card-body p-2" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {loadingReporte ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-info me-2" />
                      Cargando reporte...
                    </div>
                  ) : !Array.isArray(reporteMermas) || reporteMermas.length === 0 ? (
                    <div className="text-muted text-center py-4">
                      <i className="bi bi-inbox fs-2 d-block mb-2 opacity-50" />
                      <div className="small">Sin mermas en este rango</div>
                    </div>
                  ) : (
                    <>
                      <div className="d-flex justify-content-between align-items-center p-2 mb-2 rounded bg-danger bg-opacity-10">
                        <span className="small fw-semibold text-danger">{reporteMermas.length} registros</span>
                        <span className="fw-bold text-danger">
                          {formatMoney(reporteMermas.reduce((s, m) => s + (m?.costoTotal || 0), 0))}
                        </span>
                      </div>
                      {reporteMermas.map((merma) => (
                        <div key={merma?.id || Math.random()} className="border-bottom py-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <span className={`badge me-1 ${badgeTipo(merma?.tipoMerma)}`}
                                style={{ fontSize: '0.65rem' }}>
                                {labelTipo(merma?.tipoMerma || 'OTRO')}
                              </span>
                              <small className="text-muted">
                                {merma?.fecha ? new Date(merma.fecha).toLocaleDateString('es-MX') : '\u2014'}
                              </small>
                            </div>
                            <span className="fw-bold text-danger small">
                              {formatMoney(merma?.costoTotal || 0)}
                            </span>
                          </div>
                          <div className="small text-muted mt-1">
                            {(merma?.detalles?.length || 0)} producto(s)
                            {merma?.motivoGeneral && ` \u00b7 ${merma.motivoGeneral}`}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER — botones */}
      <div className="bg-body-tertiary border-top px-3 py-2 flex-shrink-0">
        <div className="row g-2">
          <div className="col-md-4">
            <button className="btn btn-outline-secondary w-100" onClick={limpiar}>
              <i className="bi bi-arrow-repeat me-2" />Limpiar lista
            </button>
          </div>
          <div className="col-md-8">
            <button
              className={`btn w-100 fw-bold text-white shadow-sm ${
                totalItems === 0 ? 'btn-secondary' : 'btn-danger'
              }`}
              style={{ minHeight: '44px' }}
              onClick={guardarMerma}
              disabled={totalItems === 0}
            >
              <i className="bi bi-check-circle-fill me-2" />
              Guardar Merma
              {totalItems > 0 && (
                <span className="ms-2 opacity-90 fw-normal small">
                  ({costoCargando ? 'Calculando...' : formatMoney(costoEstimado)})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
