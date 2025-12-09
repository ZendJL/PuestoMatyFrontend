import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Carrito() {
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modoPrestamo, setModoPrestamo] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [busquedaCuenta, setBusquedaCuenta] = useState('');

  const queryClient = useQueryClient();

  // Productos
  const { data: productosRaw, isLoading, error } = useQuery({
    queryKey: ['productos-pos'],
    queryFn: async () => {
      const res = await axios.get('/api/productos/activos');
      return res.data;
    },
  });

  // Cuentas para préstamo
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

  // Agregar producto: mínimo 1, acumula +1, valida stock una sola vez
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

    // Validación final contra stock
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

      alert(
        `✅ Venta #${respuesta.data.id} registrada ` +
          (modoPrestamo
            ? `como préstamo en la cuenta ${cuentaSeleccionada.nombre}`
            : 'de contado') +
          ` por $${total.toFixed(2)}`
      );

      // limpiar estado local
      setCarrito([]);
      setModoPrestamo(false);
      setCuentaSeleccionada(null);
      setBusquedaCuenta('');
      setBusqueda('');

      // refrescar productos (stock) y cuentas (saldo) en React Query
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productos-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['cuentas-prestamo'] }),
      ]);
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar venta');
    }
  };

  if (isLoading) {
    return <div>Cargando productos...</div>;
  }

  if (error) {
    return <div className="text-danger">Error al cargar productos</div>;
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center py-2">
        <h5 className="mb-0">Punto de venta</h5>
        <span className="fw-bold text-success">
          Total: ${total.toFixed(2)}
        </span>
      </div>

      <div className="card-body py-3">
        {/* Contado / Préstamo */}
        <div className="alert alert-light d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-2 py-2">
          <div>
            <div className="form-check form-check-inline mb-1">
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
            <div className="form-check form-check-inline mb-1">
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

          {modoPrestamo && (
            <div className="w-100 mt-2 mt-md-0 ms-md-3">
              <div className="mb-1">
                <label className="form-label mb-1 small">Buscar cuenta</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="Escribe nombre del cliente..."
                  value={busquedaCuenta}
                  onChange={(e) => setBusquedaCuenta(e.target.value)}
                />
              </div>

              {busquedaCuenta && (
                <div
                  className="border rounded small bg-white"
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
                              <div className="small text-muted">
                                Saldo: ${c.saldo?.toFixed(2) ?? 0}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              {cuentaSeleccionada && (
                <div className="small text-muted mt-1">
                  Cuenta seleccionada:{' '}
                  <strong>{cuentaSeleccionada.nombre}</strong>{' '}
                  (saldo actual ${cuentaSeleccionada.saldo?.toFixed(2) ?? 0})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buscador de productos */}
        <div className="mb-3">
          <label className="form-label mb-1">
            Buscar producto (código o descripción)
          </label>
          <input
            className="form-control form-control-sm"
            placeholder="Escanea código o escribe nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manejarSeleccionPorEnter()}
            autoFocus
          />
        </div>

        {/* Resultados de productos */}
        {busqueda && productosFiltrados.length > 0 && (
          <div
            className="mb-3 border rounded small"
            style={{ maxHeight: 180, overflowY: 'auto' }}
          >
            <table className="table table-hover table-sm mb-0">
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => manejarSeleccionProducto(p)}
                  >
                    <td className="text-truncate" style={{ maxWidth: 240 }}>
                      <div className="fw-semibold">{p.descripcion}</div>
                      <div className="text-muted small">Código: {p.codigo}</div>
                    </td>
                    <td className="text-end align-middle">
                      <div className="fw-semibold text-success">
                        ${p.precio}
                      </div>
                      <div className="text-muted small">
                        Inventario: {p.cantidad}
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
          <table className="table table-striped table-hover table-sm mb-0">
            <thead className="table-light sticky-top">
              <tr>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-center">Cant.</th>
                <th className="text-end">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {carrito.map((item) => (
                <tr key={item.id}>
                  <td className="text-truncate" style={{ maxWidth: 200 }}>
                    {item.descripcion}
                    <div className="small text-muted">
                      Código: {item.codigo} · Inventario: {item.stock}
                    </div>
                  </td>
                  <td className="text-end">
                    ${item.precio.toFixed(2)}
                  </td>
                  <td className="text-center" style={{ width: 80 }}>
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
                    {(item.precio * item.cantidad).toFixed(2)}
                  </td>
                  <td className="text-end">
                    <button
                      onClick={() => quitarDelCarrito(item.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {carrito.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-3">
                    Carrito vacío. Escanea o busca un producto para comenzar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acciones */}
      <div className="card-footer d-flex justify-content-end gap-2 py-2">
        <button
          onClick={() => {
            setCarrito([]);
            setModoPrestamo(false);
            setCuentaSeleccionada(null);
            setBusquedaCuenta('');
            setBusqueda('');
          }}
          className="btn btn-sm btn-secondary"
        >
          Limpiar
        </button>
        <button
          onClick={finalizarVenta}
          disabled={carrito.length === 0 || (modoPrestamo && !cuentaSeleccionada)}
          className="btn btn-sm btn-success"
        >
          {modoPrestamo ? 'Registrar préstamo' : 'Cobrar'} ${total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
