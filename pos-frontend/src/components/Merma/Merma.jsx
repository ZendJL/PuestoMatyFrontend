import { useState, useEffect, useRef } from 'react';
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
  const inputBusquedaRef = useRef(null);

  const { data: productos = [], isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: () => axios.get('/api/productos').then((res) => res.data),
  });

  useEffect(() => {
    if (inputBusquedaRef.current) {
      inputBusquedaRef.current.focus();
      inputBusquedaRef.current.select();
    }
  }, []);

  const productosFiltrados = (productos || [])
    .filter((p) => {
      const q = busqueda.toLowerCase();
      return (
        p.codigo?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const totalItems = itemsMerma.reduce((sum, i) => sum + (i.cantidad || 0), 0);

  // ... todas las funciones IGUALES (agregarItemMerma, quitarItem, etc.) ...

  const agregarItemMerma = (producto) => {
    if (!producto) return;

    setItemsMerma((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      const inventario = producto.cantidad ?? 0;

      if (inventario <= 0) {
        alert(`El producto "${producto.descripcion}" no tiene inventario disponible para merma.`);
        return prev;
      }

      if (existe) {
        const nuevaCant = Math.min(existe.cantidad + 1, inventario);
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: nuevaCant } : i
        );
      }

      return [
        ...prev,
        {
          ...producto,
          cantidad: 1,
          inventario,
        },
      ];
    });

    setBusqueda('');
    if (inputBusquedaRef.current) {
      inputBusquedaRef.current.focus();
      inputBusquedaRef.current.select();
    }
  };

  const manejarSeleccionPorEnter = () => {
    if (!busqueda) return;
    const exacto = productos?.find(
      (p) => p.codigo?.toLowerCase() === busqueda.toLowerCase()
    );
    if (exacto) {
      agregarItemMerma(exacto);
      return;
    }
    if (productosFiltrados.length > 0) {
      agregarItemMerma(productosFiltrados[0]);
    }
  };

  const quitarItem = (id) => {
    setItemsMerma((prev) => prev.filter((i) => i.id !== id));
    if (inputBusquedaRef.current) {
      inputBusquedaRef.current.focus();
      inputBusquedaRef.current.select();
    }
  };

  const cambiarCantidadItem = (id, nuevaCantidad) => {
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) return;

    setItemsMerma((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const inventario = i.inventario ?? i.cantidad ?? 0;
        const cantidadSegura = Math.min(nuevaCantidad, inventario);
        return { ...i, cantidad: cantidadSegura };
      })
    );
  };

  useEffect(() => {
    const calcular = async () => {
      if (itemsMerma.length === 0) {
        setCostoEstimado(0);
        return;
      }

      try {
        const promesas = itemsMerma.map((item) =>
          axios
            .get('/api/mermas/costo', {
              params: { productoId: item.id, cantidad: item.cantidad },
            })
            .then((res) => res.data)
        );

        const costos = await Promise.all(promesas);
        const total = costos.reduce((sum, c) => sum + (c || 0), 0);
        setCostoEstimado(total);
      } catch (err) {
        console.error(err);
      }
    };

    calcular();
  }, [itemsMerma]);

  const guardarMerma = async () => {
    if (itemsMerma.length === 0) {
      alert('No hay productos en merma');
      if (inputBusquedaRef.current) {
        inputBusquedaRef.current.focus();
        inputBusquedaRef.current.select();
      }
      return;
    }

    const conExceso = itemsMerma.find(
      (i) => (i.cantidad || 0) > (i.inventario ?? i.cantidad ?? 0)
    );
    if (conExceso) {
      alert(
        `La cantidad de merma para "${conExceso.descripcion}" no puede ser mayor al inventario actual (${conExceso.inventario ?? 0}).`
      );
      return;
    }

    try {
      const fecha = new Date().toISOString();

      const mermaData = {
        tipoMerma,
        descripcion: descripcionMerma,
        fechaSalida: fecha,
        mermaProductos: itemsMerma.map((item) => ({
          producto: { id: item.id },
          cantidad: item.cantidad,
        })),
      };

      const res = await axios.post('/api/mermas', mermaData);
      const costoTotalReal = res.data?.costoTotal ?? 0;
      setUltimoCostoTotal(costoTotalReal);

      alert(
        `✅ Merma registrada correctamente. Costo total Estimado: ${formatMoney(costoTotalReal)}`
      );

      setItemsMerma([]);
      setDescripcionMerma('');
      setBusqueda('');
      setCostoEstimado(0);

      queryClient.invalidateQueries(['productos-merma']);

      if (inputBusquedaRef.current) {
        inputBusquedaRef.current.focus();
        inputBusquedaRef.current.select();
      }
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data ||
        err?.response?.data?.message ||
        'Error al registrar merma (revisa cantidades e inventario)';
      alert(`❌ ${msg}`);
    }
  };

  if (isLoading) return <div className="fs-6 text-center py-5">Cargando productos...</div>;
  if (error) return <div className="text-danger fs-6 text-center py-5">Error: {error.message}</div>;

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '1.5rem 0' }}>
        {/* ✅ HEADER IDENTICO */}
        <div className="card-header py-3 bg-primary text-white border-bottom-0">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h5 className="mb-1">📦 Registro de Merma</h5>
              <small className="opacity-75">
                Productos caducados, dañados, uso interno, robo u otros
              </small>
              {ultimoCostoTotal > 0 && (
                <div className="mt-2">
                  <small className="opacity-75">
                    Última merma: <span className="fw-bold">{formatMoney(ultimoCostoTotal)}</span>
                  </small>
                </div>
              )}
            </div>
            <div className="col-md-4 text-end">
              <div className="fs-3 fw-bold text-warning">{formatMoney(costoEstimado)}</div>
              <small className="opacity-75">{totalItems} items</small>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            {/* ✅ COLUMNA CONFIGURACIÓN + BUSCADOR */}
            <div className="col-lg-8">
              <ProductoSearchMerma
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                productosFiltrados={productosFiltrados}
                agregarItemMerma={agregarItemMerma}
                manejarSeleccionPorEnter={manejarSeleccionPorEnter}
                inputBusquedaRef={inputBusquedaRef}
                tipoMerma={tipoMerma}
                setTipoMerma={setTipoMerma}
                descripcionMerma={descripcionMerma}
                setDescripcionMerma={setDescripcionMerma}
              />
              
              <MermaTabla
                itemsMerma={itemsMerma}
                formatMoney={formatMoney}
                cambiarCantidadItem={cambiarCantidadItem}
                quitarItem={quitarItem}
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
            </div>

            {/* ✅ COLUMNA RESUMEN */}
            <div className="col-lg-4">
              <ResumenMerma
                totalItems={totalItems}
                costoEstimado={costoEstimado}
                formatMoney={formatMoney}
                tipoMerma={tipoMerma}
                labelTipo={labelTipo}
              />
            </div>
          </div>
        </div>

        {/* ✅ FOOTER LIMPIO SIN REFRESCAR */}
        <div className="card-footer bg-body-tertiary py-3 border-top">
          <div className="row g-2">
            <div className="col-md-6">
              <button 
                className="btn btn-outline-secondary w-100 h-100" 
                onClick={() => {
                  setItemsMerma([]);
                  setDescripcionMerma('');
                  setBusqueda('');
                  setCostoEstimado(0);
                  if (inputBusquedaRef.current) inputBusquedaRef.current.focus();
                }}
              >
                <i className="bi bi-arrow-repeat me-2"/>Limpiar Todo
              </button>
            </div>
            <div className="col-md-6">
              <button 
                className={`btn w-100 h-100 fs-5 fw-bold text-white ${
                  itemsMerma.length === 0 ? 'btn-secondary' : 'btn-danger'
                }`}
                onClick={guardarMerma}
                disabled={itemsMerma.length === 0}
              >
                <i className="bi bi-check-circle-fill me-2 fs-4"/>
                Guardar Merma ({totalItems} items)
                <div className="small mt-1 opacity-90">{formatMoney(costoEstimado)}</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
