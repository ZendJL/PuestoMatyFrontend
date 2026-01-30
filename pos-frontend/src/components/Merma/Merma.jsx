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
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
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

  // ✅ QUERY 1: Productos (cache 5min)
  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: () => axios.get('/api/productos').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

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
    
    // ✅ LIMPIAR Y RE-ENFOCAR
    setBusqueda('');
    setCodigoEscaneado('');
    
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
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
          console.log('🧹 LIMPIANDO - Input numérico/textarea activo');
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
        }
        return;
      }

      // ENTER - Procesar código
      if (e.key === 'Enter') {
        if (bufferEscaner.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          
          const codigo = bufferEscaner.current.trim();
          console.log('🔍 CÓDIGO COMPLETO:', codigo, '(longitud:', codigo.length, ')');
          
          const producto = productos.find(
            p => p.codigo?.toString().trim() === codigo
          );
          
          if (producto) {
            console.log('✅ ENCONTRADO:', producto.descripcion);
            agregarItemMerma(producto);
          } else {
            console.log('❌ NO ENCONTRADO:', codigo);
            alert(`Código "${codigo}" no encontrado`);
          }
          
          // ⭐ LIMPIEZA TOTAL
          bufferEscaner.current = '';
          escaneando = false;
          setCodigoEscaneado('');
          clearTimeout(timerEscaner);
          timerEscaner = null;
          console.log('✅ BUFFER RESETEADO');
        }
        return;
      }

      // SOLO NÚMEROS
      if (!/^[0-9]$/.test(e.key)) {
        return;
      }

      // ⭐ CAPTURAR NÚMEROS
      e.preventDefault();
      e.stopPropagation();

      if (!escaneando) {
        console.log('🔢 INICIO ESCANEO');
        escaneando = true;
        bufferEscaner.current = '';
        setCodigoEscaneado('');
      }

      bufferEscaner.current += e.key;
      console.log('🔢 +', e.key, '→ BUFFER:', bufferEscaner.current);
      setCodigoEscaneado(bufferEscaner.current);

      // ⭐ TIMEOUT MÁS LARGO (500ms en lugar de 300ms)
      clearTimeout(timerEscaner);
      timerEscaner = setTimeout(() => {
        console.log('⏱️ TIMEOUT - Buffer incompleto:', bufferEscaner.current);
        bufferEscaner.current = '';
        escaneando = false;
        setCodigoEscaneado('');
      }, 500);
    };

    window.addEventListener('keydown', handleEscaneo, true);
    console.log('✅ ESCÁNER MERMA ACTIVADO');

    return () => {
      window.removeEventListener('keydown', handleEscaneo, true);
      if (timerEscaner) clearTimeout(timerEscaner);
      console.log('❌ ESCÁNER MERMA DESACTIVADO');
    };
  }, [productos]);

  // ✅ FILTRADO LOCAL
  const productosFiltrados = useMemo(() => {
    if (!productos || !Array.isArray(productos) || codigoEscaneado.length > 0) return [];
    
    return productos
      .filter(p => 
        p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
      )
      .filter(p => (p.cantidad || 0) > 0)
      .slice(0, 10);
  }, [productos, busqueda, codigoEscaneado]);

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

  // 🔥 COSTO BATCH OPTIMIZADO
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

  const quitarItem = useCallback((id) => {
    setItemsMerma(prev => prev.filter(i => i.id !== id));
    
    setTimeout(() => {
      inputBusquedaRef.current?.focus();
    }, 50);
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

  const guardarMerma = async () => {
    if (itemsMerma.length === 0) return alert('❌ Carrito vacío');

    const conExceso = itemsMerma.find(i => (i.cantidad || 0) > (i.inventario ?? 0));
    if (conExceso) return alert(`❌ Excede inventario: ${conExceso.descripcion}`);

    try {
      const mermaData = {
        tipoMerma,
        motivoGeneral: descripcionMerma || null,
        mermaProductos: itemsMerma.map(item => ({
          producto: { id: item.id },
          cantidad: item.cantidad
        }))
      };

      console.log('🔥 GUARDAR MERMA:', JSON.stringify(mermaData, null, 2));

      const res = await axios.post('/api/mermas', mermaData);
      const costoTotalReal = res.data?.costoTotal ?? 0;
      setUltimoCostoTotal(costoTotalReal);

      alert(`✅ Merma guardada\n💰 Costo: ${formatMoney(costoTotalReal)}`);
      
      // ✅ LIMPIAR TODO Y RE-ENFOCAR
      setItemsMerma([]);
      setDescripcionMerma('');
      setBusqueda('');
      setCostoEstimado(0);
      setCodigoEscaneado('');
      
      queryClient.invalidateQueries(['productos-merma']);
      
      setTimeout(() => {
        inputBusquedaRef.current?.focus();
      }, 50);
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
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '0.25rem 0' }}>
        {/* ✅ HEADER ULTRA COMPACTO Y MÁS ARRIBA */}
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
              <div className="fw-bold text-warning" style={{ fontSize: '1.4rem', lineHeight: 1.1 }}>{formatMoney(costoEstimado)}</div>
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
                  setTimeout(() => {
                    inputBusquedaRef.current?.focus();
                  }, 50);
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
