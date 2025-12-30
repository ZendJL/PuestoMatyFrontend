import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';
import ProductoSearchMerma from './ProductoSearchMerma';
import MermaTabla from './MermaTabla';
import ResumenMerma from './ResumenMerma';

const TIPOS_MERMA = ['CADUCADO', 'USO_PERSONAL', 'MAL_ESTADO', 'ROBO', 'OTRO'];

const labelTipo = (t) =>
  t === 'CADUCADO' ? 'Caducado' :
  t === 'USO_PERSONAL' ? 'Uso personal' :
  t === 'MAL_ESTADO' ? 'Mal estado' :
  t === 'ROBO' ? 'Robo' : 'Otro';

export default function Merma() {
  const queryClient = useQueryClient();
  const [itemsMerma, setItemsMerma] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoMerma, setTipoMerma] = useState('CADUCADO');
  const [descripcionMerma, setDescripcionMerma] = useState('');
  const [ultimoCostoTotal, setUltimoCostoTotal] = useState(0);
  const [costoEstimado, setCostoEstimado] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showReporte, setShowReporte] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().slice(0, 10));
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().slice(0, 10));
  const inputBusquedaRef = useRef(null);
  const costoTimeoutRef = useRef(null);

  // 🔥 REFRESH AUTOMÁTICO al entrar página
  useEffect(() => {
    console.log('🔥 MERMA REFRESH - Limpiando estado');
    setItemsMerma([]);
    setBusqueda('');
    setDescripcionMerma('');
    setCostoEstimado(0);
    setShowReporte(false);
    
    // Invalidar caché productos
    queryClient.invalidateQueries(['productos-merma']);
    
    // Focus input después de render
    setTimeout(() => inputBusquedaRef.current?.focus(), 100);
  }, []); // ✅ Solo 1x al montar componente

  // ✅ QUERY 1: Productos (cache 5min)
  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: () => axios.get('/api/productos').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  // ✅ FILTRADO LOCAL (0 queries)
  const productosFiltrados = useMemo(() => {
    if (!productos || !Array.isArray(productos)) return [];
    return productos
      .filter(p => 
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
      )
      .filter(p => (p.cantidad || 0) > 0)
      .slice(0, 10);
  }, [productos, busqueda]);

  // ✅ QUERY 2: Reporte histórico
  const { data: reporteMermas = [], isFetching: loadingReporte } = useQuery({
    queryKey: ['reporte-mermas', fechaDesde, fechaHasta],
    queryFn: async () => {
      const params = {
        desde: `${fechaDesde}T00:00:00`,
        hasta: `${fechaHasta}T23:59:59`,
      };
      const res = await axios.get('/api/mermas/reporte', { params });
      return res.data;
    },
    enabled: showReporte,
    staleTime: 10 * 60 * 1000,
  });

  // 🔥 COSTO BATCH OPTIMIZADO - 1 SOLA LLAMADA
  useEffect(() => {
    if (costoTimeoutRef.current) {
      clearTimeout(costoTimeoutRef.current);
    }

    if (itemsMerma.length === 0) {
      setCostoEstimado(0);
      return;
    }

    costoTimeoutRef.current = setTimeout(async () => {
      console.log('🔥 BATCH COSTOS:', itemsMerma.length, 'productos');
      
      try {
        const requests = itemsMerma.map(item => ({
          productoId: item.id,
          cantidad: item.cantidad
        }));

        const res = await axios.post('/api/mermas/costos-batch', requests);
        console.log('✅ BATCH RESPUESTA:', res.data);
        
        const total = res.data.reduce((sum, costo) => sum + (costo || 0), 0);
        setCostoEstimado(total);
      } catch (err) {
        console.error('❌ BATCH ERROR:', err.response?.data || err.message);
        setCostoEstimado(0);
      }
    }, 500);

    return () => {
      if (costoTimeoutRef.current) {
        clearTimeout(costoTimeoutRef.current);
      }
    };
  }, [itemsMerma]);

  const totalItems = itemsMerma.reduce((sum, i) => sum + (i.cantidad || 0), 0);

  const agregarItemMerma = useCallback((producto) => {
    setItemsMerma(prev => {
      const existe = prev.find(i => i.id === producto.id);
      const inventario = producto.cantidad ?? 0;

      if (inventario <= 0) {
        alert(`❌ Sin inventario: ${producto.descripcion}`);
        return prev;
      }

      if (existe) {
        const nuevaCant = Math.min(existe.cantidad + 1, inventario);
        return prev.map(i => i.id === producto.id ? { ...i, cantidad: nuevaCant } : i);
      }

      return [...prev, { ...producto, cantidad: 1, inventario }];
    });
    setBusqueda('');
    inputBusquedaRef.current?.focus();
  }, []);

  const quitarItem = useCallback((id) => {
    setItemsMerma(prev => prev.filter(i => i.id !== id));
    inputBusquedaRef.current?.focus();
  }, []);

  const cambiarCantidadItem = useCallback((id, nuevaCantidad) => {
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) return;
    setItemsMerma(prev =>
      prev.map(i => {
        if (i.id !== id) return i;
        const cantidadSegura = Math.min(nuevaCantidad, i.inventario ?? 0);
        return { ...i, cantidad: cantidadSegura };
      })
    );
  }, []);

  // ✅ FIX 400 Bad Request: Backend espera producto.id
  const guardarMerma = async () => {
    if (itemsMerma.length === 0) return alert('❌ Carrito vacío');

    const conExceso = itemsMerma.find(i => (i.cantidad || 0) > (i.inventario ?? 0));
    if (conExceso) return alert(`❌ Excede inventario: ${conExceso.descripcion}`);

    try {
      const mermaData = {
        tipoMerma,
        motivoGeneral: descripcionMerma || null,
        mermaProductos: itemsMerma.map(item => ({
          producto: { id: item.id },  // ✅ Backend MermaProducto.producto.id
          cantidad: item.cantidad
        }))
      };

      console.log('🔥 GUARDAR MERMA:', JSON.stringify(mermaData, null, 2));

      const res = await axios.post('/api/mermas', mermaData);
      const costoTotalReal = res.data?.costoTotal ?? 0;
      setUltimoCostoTotal(costoTotalReal);

      alert(`✅ Merma guardada\n💰 Costo: ${formatMoney(costoTotalReal)}`);
      
      // ✅ LIMPIAR TODO
      setItemsMerma([]);
      setDescripcionMerma('');
      setBusqueda('');
      setCostoEstimado(0);
      
      queryClient.invalidateQueries(['productos-merma']);
      inputBusquedaRef.current?.focus();
    } catch (err) {
      console.error('❌ ERROR GUARDAR:', err.response?.data);
      alert(`❌ ${err.response?.data || 'Error al guardar merma'}`);
    }
  };

  const toggleReporte = () => {
    setShowReporte(!showReporte);
  };

  if (isLoading) return <div className="fs-6 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-6 text-center py-5">Error: {error.message}</div>;

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '1.5rem 0' }}>
        {/* HEADER */}
        <div className="card-header py-3 bg-primary text-white border-bottom-0">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h5 className="mb-1">📦 Registro de Merma</h5>
              <small className="opacity-75">Caducados, dañados, uso personal, robo</small>
              {ultimoCostoTotal > 0 && (
                <small className="opacity-75 d-block mt-1">
                  Última: <strong>{formatMoney(ultimoCostoTotal)}</strong>
                </small>
              )}
            </div>
            <div className="col-md-4 text-end">
              <div className="fs-3 fw-bold text-warning">{formatMoney(costoEstimado)}</div>
              <small>{totalItems} items</small>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            {/* COLUMNA PRINCIPAL */}
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

            {/* RESUMEN + REPORTE */}
            <div className="col-lg-4">
              <ResumenMerma
                totalItems={totalItems}
                costoEstimado={costoEstimado}
                tipoMerma={tipoMerma}
                labelTipo={labelTipo}
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
                      <div className="text-center py-3">Cargando...</div>
                    ) : reporteMermas.length === 0 ? (
                      <div className="text-muted text-center py-3">Sin mermas</div>
                    ) : (
                      <div>
                        {reporteMermas.slice(0, 5).map((merma) => (
                          <div key={merma.id} className="border-bottom py-2 small">
                            <div className="fw-bold">{labelTipo(merma.tipoMerma)}</div>
                            <div>{formatMoney(merma.costoTotal || 0)}</div>
                            <div className="text-muted">
                              {merma.detalles?.length || 0} productos • {new Date(merma.fecha).toLocaleDateString()}
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

        {/* FOOTER */}
        <div className="card-footer bg-body-tertiary py-3 border-top">
          <div className="row g-2">
            <div className="col-md-6">
              <button 
                className="btn btn-outline-secondary w-100 h-100" 
                onClick={() => {
                  setItemsMerma([]);
                  setDescripcionMerma('');
                  setBusqueda('');
                  inputBusquedaRef.current?.focus();
                }}
              >
                <i className="bi bi-arrow-repeat me-2"/>Limpiar
              </button>
            </div>
            <div className="col-md-6">
              <button 
                className={`btn w-100 h-100 fs-5 fw-bold text-white shadow-sm ${
                  itemsMerma.length === 0 ? 'btn-secondary' : 'btn-danger'
                }`}
                onClick={guardarMerma}
                disabled={itemsMerma.length === 0}
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
