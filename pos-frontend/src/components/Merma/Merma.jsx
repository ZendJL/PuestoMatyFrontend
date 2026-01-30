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
  const [pageSize, setPageSize] = useState(10);
  const [showReporte, setShowReporte] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));
  
  const inputBusquedaRef = useRef(null);
  const costoTimeoutRef = useRef(null);

  // ⭐ AUTOFOCUS al montar componente
  useEffect(() => {
    console.log('🔥 MERMA REFRESH - Limpiando estado');
    setItemsMerma([]);
    setBusqueda('');
    setDescripcionMerma('');
    setCostoEstimado(0);
    setShowReporte(false);
    setCodigoEscaneado('');
    
    queryClient.invalidateQueries(['productos-merma']);
    
    const timer = setTimeout(() => {
      inputBusquedaRef.current?.focus();
      console.log('🎯 AUTOFOCUS aplicado en Merma');
    }, 150);
    
    return () => clearTimeout(timer);
  }, []);

  // ✅ QUERY 1: Productos (cache 5min) - PROTEGIDO
  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: async () => {
      const response = await axios.get('/api/productos');
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ✅ TOTALES PROTEGIDOS
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
        alert(`❌ Sin inventario: ${producto.descripcion || 'Producto sin nombre'}`);
        return prevSeguro;
      }

      if (existe) {
        const nuevaCant = Math.min((existe.cantidad || 0) + 1, inventario);
        return prevSeguro.map(i => i?.id === producto.id ? { ...i, cantidad: nuevaCant } : i);
      }

      return [...prevSeguro, { 
        ...producto, 
        cantidad: 1, 
        inventario: inventario 
      }];
    });
    
    setBusqueda('');
    setCodigoEscaneado('');
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  }, []);

  // ⭐ LISTENER GLOBAL DE ESCANEO - PROTEGIDO
  useEffect(() => {
    const bufferEscaner = { current: '' };
    let timerEscaner = null;
    let escaneando = false;

    const handleEscaneo = (e) => {
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

      if (e.key === 'Enter') {
        if (bufferEscaner.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          
          const codigo = bufferEscaner.current.trim();
          const producto = Array.isArray(productos) 
            ? productos.find(p => (p?.codigo || '').toString().trim() === codigo)
            : null;
          
          if (producto) {
            agregarItemMerma(producto);
          } else {
            alert(`Código "${codigo}" no encontrado`);
          }
          
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
          timerEscaner = null;
        }
        return;
      }

      if (!/^[0-9]$/.test(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

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
    return () => window.removeEventListener('keydown', handleEscaneo, true);
  }, [productos, agregarItemMerma]);

  // ✅ FILTRADO LOCAL - PROTEGIDO
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

  // ✅ QUERY 2: Reporte histórico - PROTEGIDO
  const { data: reporteMermas = [], isFetching: loadingReporte } = useQuery({
    queryKey: ['reporte-mermas', fechaDesde, fechaHasta],
    queryFn: async () => {
      const params = {
        desde: `${fechaDesde}T00:00:00`,
        hasta: `${fechaHasta}T23:59:59`,
      };
      const res = await axios.get('/api/mermas/reporte', { params });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: showReporte,
    staleTime: 10 * 60 * 1000,
  });

  // 🔥 COSTO BATCH OPTIMIZADO - PROTEGIDO
  useEffect(() => {
    if (costoTimeoutRef.current) clearTimeout(costoTimeoutRef.current);

    if (!Array.isArray(itemsMerma) || itemsMerma.length === 0) {
      setCostoEstimado(0);
      return;
    }

    costoTimeoutRef.current = setTimeout(async () => {
      try {
        const requests = itemsMerma
          .filter(item => item?.id)
          .map(item => ({
            productoId: item.id,
            cantidad: item.cantidad || 0
          }));

        if (requests.length === 0) {
          setCostoEstimado(0);
          return;
        }

        const res = await axios.post('/api/mermas/costos-batch', requests);
        const total = Array.isArray(res.data)
          ? res.data.reduce((sum, costo) => sum + (costo || 0), 0)
          : 0;
        setCostoEstimado(total);
      } catch (err) {
        console.error('❌ BATCH ERROR:', err.response?.data || err.message);
        setCostoEstimado(0);
      }
    }, 500);

    return () => {
      if (costoTimeoutRef.current) clearTimeout(costoTimeoutRef.current);
    };
  }, [itemsMerma]);

  const quitarItem = useCallback((id) => {
    if (!id) return;
    setItemsMerma(prev => 
      Array.isArray(prev) ? prev.filter(i => i?.id !== id) : []
    );
    setTimeout(() => inputBusquedaRef.current?.focus(), 50);
  }, []);

  const cambiarCantidadItem = useCallback((id, nuevaCantidad) => {
    if (!id || Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) return;
    setItemsMerma(prev =>
      Array.isArray(prev)
        ? prev.map(i => {
            if (i?.id !== id) return i;
            const cantidadSegura = Math.min(nuevaCantidad, i?.inventario ?? 0);
            return { ...i, cantidad: cantidadSegura };
          })
        : []
    );
  }, []);

  const guardarMerma = async () => {
    if (!Array.isArray(itemsMerma) || itemsMerma.length === 0) {
      return alert('❌ Carrito vacío');
    }

    const conExceso = itemsMerma.find(i => (i?.cantidad || 0) > (i?.inventario ?? 0));
    if (conExceso) {
      return alert(`❌ Excede inventario: ${conExceso.descripcion || 'Producto sin nombre'}`);
    }

    try {
      const mermaData = {
        tipoMerma,
        motivoGeneral: descripcionMerma?.trim() || null,
        mermaProductos: itemsMerma
          .filter(item => item?.id)
          .map(item => ({
            producto: { id: item.id },
            cantidad: item.cantidad || 0
          }))
      };

      const res = await axios.post('/api/mermas', mermaData);
      const costoTotalReal = res.data?.costoTotal ?? 0;

      alert(`✅ Merma guardada\n💰 Costo: ${formatMoney(costoTotalReal)}`);
      
      setItemsMerma([]);
      setDescripcionMerma('');
      setBusqueda('');
      setCostoEstimado(0);
      setCodigoEscaneado('');
      queryClient.invalidateQueries(['productos-merma']);
      
      setTimeout(() => inputBusquedaRef.current?.focus(), 50);
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || err.response?.data || 'Error al guardar merma'}`);
    }
  };

  const toggleReporte = () => setShowReporte(!showReporte);

  if (isLoading) return <div className="fs-6 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-6 text-center py-5">Error: {error.message}</div>;

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '0.25rem 0' }}>
        <div className="card-header p-2 bg-primary text-white border-bottom-0" style={{ minHeight: '48px' }}>
          <div className="row align-items-center g-0 h-100">
            <div className="col-md-8">
              <div className="d-flex align-items-center h-100">
                <h6 className="mb-0 me-2" style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>📦 Registro Merma</h6>
                <small className="opacity-75" style={{ fontSize: '0.7rem' }}>
                  {codigoEscaneado.length > 0 && '🔢 '}
                </small>
              </div>
            </div>
            <div className="col-md-4 text-end">
              <div className="fw-bold text-warning" style={{ fontSize: '1.4rem', lineHeight: 1.1 }}>
                {formatMoney(costoEstimado)}
              </div>
              <small className="opacity-75" style={{ fontSize: '0.65rem' }}>{totalItems} items</small>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
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
                tipoMerma={tipoMerma}
                labelTipo={(t) => t === 'CADUCADO' ? 'Caducado' : t === 'USO_PERSONAL' ? 'Uso personal' : t === 'MAL_ESTADO' ? 'Mal estado' : t === 'ROBO' ? 'Robo' : 'Otro'}
                formatMoney={formatMoney}
              />
              
              <div className="mt-3">
                <button 
                  className="btn btn-outline-info w-100 mb-2"
                  onClick={toggleReporte}
                >
                  {showReporte ? '❌ Ocultar' : '📊 Ver'} Reporte
                </button>
              </div>

              {showReporte && (
                <div className="card shadow-sm border-info">
                  <div className="card-header bg-info bg-opacity-10">
                    <div className="row">
                      <div className="col-6">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={fechaDesde}
                          onChange={(e) => setFechaDesde(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={fechaHasta}
                          onChange={(e) => setFechaHasta(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {loadingReporte ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm me-2" role="status"/>
                        Cargando...
                      </div>
                    ) : !Array.isArray(reporteMermas) || reporteMermas.length === 0 ? (
                      <div className="text-muted text-center py-5">
                        <i className="bi bi-inbox fs-2 d-block mb-3 opacity-50"/>
                        <div>Sin mermas en este rango</div>
                      </div>
                    ) : (
                      <div>
                        {reporteMermas.slice(0, 5).map((merma) => (
                          <div key={merma?.id || Math.random()} className="border-bottom py-2 small">
                            <div className="fw-bold">{merma?.tipoMerma || 'N/A'}</div>
                            <div>{formatMoney(merma?.costoTotal || 0)}</div>
                            <div className="text-muted">
                              {(merma?.detalles?.length || 0)} productos • 
                              {merma?.fecha ? new Date(merma.fecha).toLocaleDateString() : 'Sin fecha'}
                            </div>
                          </div>
                        ))}
                        {reporteMermas.length > 5 && (
                          <small className="text-muted">+{reporteMermas.length - 5} más...</small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card-footer bg-body-tertiary py-3 border-top">
          <div className="row g-2">
            <div className="col-md-6">
              <button 
                className="btn btn-outline-secondary w-100 h-100" 
                onClick={() => {
                  setItemsMerma([]);
                  setDescripcionMerma('');
                  setBusqueda('');
                  setCodigoEscaneado('');
                  setTimeout(() => inputBusquedaRef.current?.focus(), 50);
                }}
              >
                <i className="bi bi-arrow-repeat me-2"/>Limpiar
              </button>
            </div>
            <div className="col-md-6">
              <button 
                className={`btn w-100 h-100 fs-5 fw-bold text-white shadow-sm ${
                  totalItems === 0 ? 'btn-secondary' : 'btn-danger'
                }`}
                onClick={guardarMerma}
                disabled={totalItems === 0}
              >
                <i className="bi bi-check-circle-fill me-2 fs-4"/>
                Guardar Merma
                <div className="small mt-1 opacity-90">{formatMoney(costoEstimado)}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
