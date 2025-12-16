import { useState, useMemo } from 'react';
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

  const queryClient = useQueryClient();

  const { data: productosRaw, isLoading, error } = useQuery({
    queryKey: ['productos-pos'],
    queryFn: async () => {
      const res = await axios.get('/api/productos/activos');
      return res.data;
    },
  });

  const { data: cuentasRaw } = useQuery({
    queryKey: ['cuentas-prestamo'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas');
      return res.data;
    },
  });

  const productos = Array.isArray(productosRaw)
    ? productosRaw
    : Array.isArray(productosRaw?.content)
    ? productosRaw.content
    : [];

  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];

  const productosFiltrados = productos
    .filter((p) => {
      const q = busqueda.toLowerCase();
      return (
        p.codigo?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const total = useMemo(
    () => venta.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [venta]
  );

  const cambio = useMemo(() => {
    const pago = Number(pagoCliente);
    if (Number.isNaN(pago)) return 0;
    return Math.max(pago - total, 0);
  }, [pagoCliente, total]);

  const agregarAlCarrito = (producto) => {
    const stock = producto.cantidad ?? 0;
    if (stock <= 0) {
      alert('Sin inventario disponible');
      return;
    }

    const enCarrito =
      venta.find((i) => i.id === producto.id)?.cantidad ?? 0;
    const nuevaCantidad = enCarrito + 1;

    if (nuevaCantidad > stock) {
      alert(
        `No puedes vender más de ${stock} unidades de ${producto.descripcion}`
      );
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

  const manejarSeleccionProducto = (producto) => {
    if (!producto) return;
    agregarAlCarrito(producto);
  };

  const manejarSeleccionPorEnter = () => {
    if (!busqueda) return;

    const exacto = productos.find(
      (p) => p.codigo?.toLowerCase() === busqueda.toLowerCase()
    );
    if (exacto) {
      manejarSeleccionProducto(exacto);
      return;
    }

    if (productosFiltrados.length > 0) {
      manejarSeleccionProducto(productosFiltrados[0]);
    }
  };

  const quitarDelCarrito = (id) => {
    setVenta((prev) => prev.filter((item) => item.id !== id));
  };

  const cambiarCantidad = (id, nuevaCantidadRaw) => {
    let nuevaCantidad = Number(nuevaCantidadRaw);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) {
      nuevaCantidad = 1;
    }

    setVenta((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const stock = item.stock ?? item.cantidad ?? 0;
        if (nuevaCantidad > stock) {
          alert(
            `No puedes vender más de ${stock} unidades de ${item.descripcion}`
          );
          return { ...item, cantidad: stock };
        }
        return { ...item, cantidad: nuevaCantidad };
      })
    );
  };

  const aplicarDenominacion = (monto) => {
    setPagoCliente(String(monto.toFixed(2)));
  };

  const limpiarVenta = () => {
    setVenta([]);
    setModoPrestamo(false);
    setCuentaSeleccionada(null);
    setBusquedaCuenta('');
    setBusqueda('');
    setPagoCliente('');
  };

  const finalizarVenta = async () => {
    if (venta.length === 0) {
      alert('Carrito vacío');
      return;
    }

    if (modoPrestamo && !cuentaSeleccionada) {
      alert('Selecciona la cuenta del cliente para registrar el préstamo');
      return;
    }

    if (!modoPrestamo) {
      const pago = Number(pagoCliente);
      if (Number.isNaN(pago) || pago < total) {
        alert('El pago del cliente debe ser al menos igual al total.');
        return;
      }
    }

    const invalido = venta.find((item) => {
      const stock = item.stock ?? item.cantidad ?? 0;
      return item.cantidad > stock;
    });
    if (invalido) {
      alert(
        `La cantidad de ${invalido.descripcion} supera el inventario disponible. Ajusta la venta.`
      );
      return;
    }

    try {
      const ventaData = {
  fecha: new Date().toISOString(),
  cuentaId: modoPrestamo ? cuentaSeleccionada.id : null,
  total,
  status: modoPrestamo ? 'PRESTAMO' : 'COMPLETADA',
  pagoCliente: modoPrestamo ? null : Number(pagoCliente) || total,
  ventaProductos: venta.map((item) => ({
    producto: { id: item.id, descripcion: item.descripcion },
    cantidad: item.cantidad,
    precioUnitario: item.precio,
  })),
};

      const respuesta = await axios.post('/api/ventas', ventaData);
      const ventaGuardada = respuesta.data;

      const mensajeCambio =
        !modoPrestamo && cambio > 0
          ? `\nCambio a entregar: ${formatMoney(cambio)}`
          : '';

      alert(
        `✅ Venta #${ventaGuardada.id} registrada ` +
          (modoPrestamo
            ? `como préstamo en la cuenta ${cuentaSeleccionada.nombre}`
            : 'de contado') +
          ` por ${formatMoney(total)}${mensajeCambio}`
      );

      const deseaImprimir = window.confirm('¿Imprimir ticket de esta venta?');
      if (deseaImprimir) {
        imprimirTicketVenta(ventaGuardada, {
          total,
          pagoCliente,
          cambio,
          modoPrestamo,
          cuentaSeleccionada,
        });
      }

      limpiarVenta();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['cuentas-prestamo'] }),
      ]);
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar venta');
    }
  };

  if (isLoading) return <div>Cargando productos...</div>;
  if (error)
    return <div className="text-danger">Error al cargar productos</div>;

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)',
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Punto de venta</h5>
            <small className="text-white-100">
              Registra ventas de contado o a crédito
            </small>
          </div>
          <div className="text-end">
            <div className="med text-white-100">Total a cobrar</div>
            <div className="fs-4 fw-bold text-warning">
              {formatMoney(total)}
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-8 border-end">
              <ProductoSearch
                busqueda={busqueda}
                setBusqueda={setBusqueda}
                productosFiltrados={productosFiltrados}
                manejarSeleccionProducto={manejarSeleccionProducto}
                manejarSeleccionPorEnter={manejarSeleccionPorEnter}
              />
              <VentaTabla
                carrito={venta}
                formatMoney={formatMoney}
                cambiarCantidad={cambiarCantidad}
                quitarDelCarrito={quitarDelCarrito}
              />
            </div>

            <div className="col-md-4">
              <ModoPago
                modoPrestamo={modoPrestamo}
                setModoPrestamo={setModoPrestamo}
              />

              {modoPrestamo && (
                <CuentaPrestamo
                  cuentas={cuentas}
                  cuentaSeleccionada={cuentaSeleccionada}
                  setCuentaSeleccionada={setCuentaSeleccionada}
                  busquedaCuenta={busquedaCuenta}
                  setBusquedaCuenta={setBusquedaCuenta}
                  formatMoney={formatMoney}
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

        <div className="card-footer d-flex justify-content-between align-items-center py-2">
          <button
            onClick={limpiarVenta}
            className="btn btn-sm btn-outline-secondary"
          >
            Limpiar venta
          </button>
          <button
            onClick={finalizarVenta}
            disabled={
              venta.length === 0 || (modoPrestamo && !cuentaSeleccionada)
            }
            className="btn btn-sm btn-success"
          >
            {modoPrestamo ? 'Registrar préstamo' : 'Cobrar'} ·{' '}
            {formatMoney(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
