import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Formato de dinero
const formatMoney = (value) => {
  if (!value && value !== 0) return '$0.00';
  return `$${Number(value)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export default function Carrito() {
  const [carrito, setCarrito] = useState([]);
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
    () => carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [carrito]
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
      carrito.find((i) => i.id === producto.id)?.cantidad ?? 0;
    const nuevaCantidad = enCarrito + 1;

    if (nuevaCantidad > stock) {
      alert(
        `No puedes vender más de ${stock} unidades de ${producto.descripcion}`
      );
      return;
    }

    setCarrito((prev) => {
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
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const cambiarCantidad = (id, nuevaCantidadRaw) => {
    let nuevaCantidad = Number(nuevaCantidadRaw);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 1) {
      nuevaCantidad = 1;
    }

    setCarrito((prev) =>
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

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
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

    const invalido = carrito.find((item) => {
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
        total: total,
        status: modoPrestamo ? 'PRESTAMO' : 'COMPLETADA',
        ventaProductos: carrito.map((item) => ({
          producto: { id: item.id },
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      };

      const respuesta = await axios.post('/api/ventas', ventaData);

      const mensajeCambio =
        !modoPrestamo && cambio > 0
          ? `\nCambio a entregar: ${formatMoney(cambio)}`
          : '';

      alert(
        `✅ Venta #${respuesta.data.id} registrada ` +
          (modoPrestamo
            ? `como préstamo en la cuenta ${cuentaSeleccionada.nombre}`
            : 'de contado') +
          ` por ${formatMoney(total)}${mensajeCambio}`
      );

      setCarrito([]);
      setModoPrestamo(false);
      setCuentaSeleccionada(null);
      setBusquedaCuenta('');
      setBusqueda('');
      setPagoCliente('');

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
  if (error) return <div className="text-danger">Error al cargar productos</div>;

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)', // 50px por lado
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Header azul, estilo clásico en modo claro */}
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
            {/* Columna izquierda: búsqueda y carrito */}
            <div className="col-md-8 border-end">
              {/* Buscador de productos */}
              <div className="mb-2">
                <label className="form-label mb-1 fw-semibold">
                  Producto
                </label>
                <input
                  className="form-control form-control-sm"
                  placeholder="Escanea código o escribe nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && manejarSeleccionPorEnter()
                  }
                  autoFocus
                />
              </div>

              {/* Resultados */}
              {busqueda && productosFiltrados.length > 0 && (
                <div
                  className="mb-3 border rounded small"
                  style={{ maxHeight: 160, overflowY: 'auto' }}
                >
                  <table className="table table-hover table-sm mb-0">
                    <tbody>
                      {productosFiltrados.map((p) => (
                        <tr
                          key={p.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => manejarSeleccionProducto(p)}
                        >
                          <td
                            className="text-truncate"
                            style={{ maxWidth: 260 }}
                          >
                            <div className="fw-semibold">{p.descripcion}</div>
                            <div className="text-body-secondary small">
                                                            Código: {p.codigo}
                            </div>
                          </td>
                          <td className="text-end align-middle">
                            <div className="fw-semibold text-success">
                              {formatMoney(p.precio)}
                            </div>
                            <div className="text-body-secondary small">
                              Stock: {p.cantidad}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Carrito */}
              <div
                className="border rounded small"
                style={{ maxHeight: 260, overflowY: 'auto' }}
              >
                <table className="table table-hover table-sm mb-0">
                  <thead className="sticky-top">
                    <tr>
                      <th>Producto</th>
                      <th className="text-end">Precio</th>
                      <th className="text-center" style={{ width: 90 }}>
                        Cant.
                      </th>
                      <th className="text-end">Subtotal</th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {carrito.map((item) => (
                      <tr key={item.id}>
                        <td className="text-truncate" style={{ maxWidth: 220 }}>
                          {item.descripcion}
                          <div className="small text-body-secondary">
                            Código: {item.codigo} · Stock: {item.stock}
                          </div>
                        </td>
                        <td className="text-end">
                          {formatMoney(item.precio)}
                        </td>
                        <td className="text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              cambiarCantidad(item.id, e.target.value)
                            }
                            className="form-control form-control-sm text-center"
                          />
                        </td>
                        <td className="text-end fw-semibold text-success">
                          {formatMoney(item.precio * item.cantidad)}
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => quitarDelCarrito(item.id)}
                            className="btn btn-sm btn-outline-danger"
                            title="Quitar"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {carrito.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-body-secondary py-3"
                        >
                          Carrito vacío. Escanea o busca un producto para
                          comenzar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Columna derecha: modo pago, cuenta, pago/cambio */}
            <div className="col-md-4">
              {/* Modo de pago */}
              <div className="mb-3 border rounded p-2 bg-body-tertiary">
                <div className="fw-semibold mb-1">Modo de pago</div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="modoPago"
                    id="modoContado"
                    checked={!modoPrestamo}
                    onChange={() => setModoPrestamo(false)}
                  />
                  <label className="form-check-label" htmlFor="modoContado">
                    Contado
                  </label>
                </div>
                <div className="form-check mt-1">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="modoPago"
                    id="modoPrestamo"
                    checked={modoPrestamo}
                    onChange={() => setModoPrestamo(true)}
                  />
                  <label className="form-check-label" htmlFor="modoPrestamo">
                    Préstamo / Por pagar
                  </label>
                </div>
              </div>

              {/* Cuenta de cliente cuando es préstamo */}
              {modoPrestamo && (
                <div className="mb-3 border rounded p-2 bg-body-tertiary">
                  <div className="fw-semibold mb-1">Cuenta del cliente</div>
                  <input
                    className="form-control form-control-sm mb-1"
                    placeholder="Buscar por nombre..."
                    value={busquedaCuenta}
                    onChange={(e) => setBusquedaCuenta(e.target.value)}
                  />
                  {busquedaCuenta && (
                    <div
                      className="border rounded small bg-body"
                      style={{ maxHeight: 140, overflowY: 'auto' }}
                    >
                      <table className="table table-sm mb-0">
                        <tbody>
                          {cuentas
                            .filter((c) =>
                              c.nombre
                                ?.toLowerCase()
                                .includes(busquedaCuenta.toLowerCase())
                            )
                            .slice(0, 8)
                            .map((c) => (
                              <tr
                                key={c.id}
                                style={{ cursor: 'pointer' }}
                                className={
                                  cuentaSeleccionada?.id === c.id
                                    ? 'table-primary'
                                    : ''
                                }
                                onClick={() => {
                                  setCuentaSeleccionada(c);
                                  setBusquedaCuenta(c.nombre);
                                }}
                              >
                                <td>
                                  <div className="fw-semibold">{c.nombre}</div>
                                  <div className="small ">
                                    Saldo: {formatMoney(c.saldo ?? 0)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {cuentaSeleccionada && (
                    <div className="small text-body-secondary mt-1">
                      Seleccionada:{' '}
                      <strong>{cuentaSeleccionada.nombre}</strong> (saldo{' '}
                      {formatMoney(cuentaSeleccionada.saldo ?? 0)})
                    </div>
                  )}
                </div>
              )}

              {/* Pago y cambio */}
              {!modoPrestamo && (
  <div className="mb-3 border rounded p-2 bg-body-tertiary">
    <div className="fw-semibold mb-1">Cobro</div>
    <div className="mb-2">
      <label className="form-label mb-1 small">
        Pago del cliente
      </label>
      <div className="input-group input-group-sm">
        <span className="input-group-text">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control"
          value={pagoCliente}
          onChange={(e) => setPagoCliente(e.target.value)}
          placeholder="0.00"
        />
      </div>
    </div>
  </div>
)}


              {/* Resumen final */}
              <div className="border rounded p-3 bg-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Artículos</span>
                  <span className="fs-6 fw-semibold">{carrito.length}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Subtotal</span>
                  <span className="fs-6 fw-semibold">
                    {formatMoney(total)}
                  </span>
                </div>
                {!modoPrestamo && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold">Pago</span>
                    <span className="fs-6 fw-semibold">
                      {formatMoney(Number(pagoCliente) || 0)}
                    </span>
                  </div>
                )}
                {!modoPrestamo && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">Cambio</span>
                    <span className="fs-5 fw-bold text-success">
                      {formatMoney(cambio)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="card-footer d-flex justify-content-between align-items-center py-2">
          <button
            onClick={() => {
              setCarrito([]);
              setModoPrestamo(false);
              setCuentaSeleccionada(null);
              setBusquedaCuenta('');
              setBusqueda('');
              setPagoCliente('');
            }}
            className="btn btn-sm btn-outline-secondary"
          >
            Limpiar venta
          </button>
          <button
            onClick={finalizarVenta}
            disabled={
              carrito.length === 0 || (modoPrestamo && !cuentaSeleccionada)
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
