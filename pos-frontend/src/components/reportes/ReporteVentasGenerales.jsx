import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import { imprimirTicketVenta } from '../Venta/TicketPrinter';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10); // YYYY-MM-DD
}

function getInicioFinPeriodo(tipo) {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (tipo === 'dia') {
    const finDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      23,
      59,
      59
    );
    return { desde: inicioDia, hasta: finDia };
  }
  if (tipo === 'semana') {
    const day = hoy.getDay(); // 0=domingo
    const diff = hoy.getDate() - day + (day === 0 ? -6 : 1); // lunes
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), diff);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return { desde: inicioSemana, hasta: finSemana };
  }
  if (tipo === 'mes') {
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    return { desde: inicioMes, hasta: finMes };
  }
  return { desde: inicioDia, hasta: hoy };
}

export default function ReporteVentasGenerales() {
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const { desde: dIni, hasta: dFin } = getInicioFinPeriodo('dia');
  const [desde, setDesde] = useState(formatoFechaInput(dIni));
  const [hasta, setHasta] = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const { data: ventasRaw, isLoading, error } = useQuery({
    queryKey: ['ventas-reporte-generales'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas');
      return res.data;
    },
  });

  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

  const ventasFiltradas = useMemo(() => {
    if (!ventas.length) return [];

    const dDesde = new Date(desde + 'T00:00:00');
    const dHasta = new Date(hasta + 'T23:59:59');

    let lista = ventas
      .filter((v) => {
        if (!v.fecha) return false;
        const f = new Date(v.fecha);
        return f >= dDesde && f <= dHasta;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const texto = busqueda.toLowerCase();
    if (texto) {
      lista = lista.filter((v) => {
        const idStr = String(v.id ?? '');
        const cuentaNombre = v.cuenta?.nombre ?? '';
        const desc = v.descripcion ?? '';
        return (
          idStr.includes(texto) ||
          cuentaNombre.toLowerCase().includes(texto) ||
          desc.toLowerCase().includes(texto)
        );
      });
    }

    return lista;
  }, [ventas, desde, hasta, busqueda]);

  const totalVentas = ventasFiltradas.length;
  const totalImporte = ventasFiltradas.reduce(
    (sum, v) => sum + (v.total || 0),
    0
  );
  const totalPrestamos = ventasFiltradas
    .filter((v) => v.status === 'PRESTAMO')
    .reduce((sum, v) => sum + (v.total || 0), 0);

  const gananciaTotalGeneral = ventasFiltradas.reduce((acum, v) => {
    const gananciaVenta = (v.ventaProductos || []).reduce((s, vp) => {
      const precioVenta = vp.precioUnitario ?? vp.precio ?? 0;
      const costoCompra = vp.producto?.precioCompra ?? 0;
      const gananciaUnidad = precioVenta - costoCompra;
      return s + (vp.cantidad || 0) * gananciaUnidad;
    }, 0);
    return acum + gananciaVenta;
  }, 0);

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  const handleClickVenta = (venta) => {
    setVentaSeleccionada(venta);
  };

  const reimprimirTicket = () => {
    if (!ventaSeleccionada) return;

    const total = Number(ventaSeleccionada.total || 0);
    const pagoCliente = Number(
      ventaSeleccionada.pagoCliente ?? ventaSeleccionada.total ?? 0
    );
    const cambio = Math.max(pagoCliente - total, 0);

    imprimirTicketVenta(ventaSeleccionada, {
      total,
      pagoCliente,
      cambio,
      modoPrestamo: ventaSeleccionada.status === 'PRESTAMO',
      cuentaSeleccionada: ventaSeleccionada.cuenta || null,
    });
  };

  if (isLoading) {
    return <div className="fs-6">Cargando ventas...</div>;
  }
  if (error) {
    return <div className="text-danger fs-6">Error al cargar ventas</div>;
  }

  const totalDetalle = ventaSeleccionada
    ? Number(ventaSeleccionada.total || 0)
    : 0;
  const pagoDetalle = ventaSeleccionada
    ? Number(
        ventaSeleccionada.pagoCliente ??
          ventaSeleccionada.total ??
          0
      )
    : 0;
  const cambioDetalle = Math.max(pagoDetalle - totalDetalle, 0);

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm fs-6 w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)',
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Historial de ventas</h5>
            <small className="text-white-50">
              Consulta ventas de contado y préstamos en el período seleccionado.
            </small>
          </div>
          <div className="text-end">
            <div className="small text-white-50">Total vendido</div>
            <div className="fs-5 fw-bold">
              {formatMoney(totalImporte)}
            </div>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          {/* Resumen */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Ventas</div>
                <div className="fs-5 fw-bold">{totalVentas}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Importe total</div>
                <div className="fs-5 fw-bold text-success">
                  {formatMoney(totalImporte)}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Préstamos</div>
                <div className="fs-5 fw-bold text-warning">
                  {formatMoney(totalPrestamos)}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Ganancia total</div>
                <div className="fs-5 fw-bold text-primary">
                  {formatMoney(gananciaTotalGeneral)}
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="border rounded p-2 mb-3 bg-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label mb-1">Período rápido</label>
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${
                      tipoPeriodo === 'dia' ? 'active' : ''
                    }`}
                    onClick={() => aplicarPeriodo('dia')}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${
                      tipoPeriodo === 'semana' ? 'active' : ''
                    }`}
                    onClick={() => aplicarPeriodo('semana')}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${
                      tipoPeriodo === 'mes' ? 'active' : ''
                    }`}
                    onClick={() => aplicarPeriodo('mes')}
                  >
                    Mes
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${
                      tipoPeriodo === 'rango' ? 'active' : ''
                    }`}
                    onClick={() => aplicarPeriodo('rango')}
                  >
                    Rango
                  </button>
                </div>
              </div>

              <div className="col-auto">
                <label className="form-label mb-1">Desde</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <label className="form-label mb-1">Hasta</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label mb-1">Buscar venta</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="ID, nombre de cuenta, descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="col small text-body-primary">
                {totalVentas} ventas en el rango seleccionado.
              </div>
            </div>
          </div>

          <div className="row">
            {/* Tabla de ventas */}
            <div className="col-md-7">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Ventas</h6>
                  <small className="text-body-primary">
                    Haz clic en una fila para ver el detalle.
                  </small>
                </div>
                <div className="card-body p-0 bg-body">
                  <div
                    className="table-responsive"
                    style={{ maxHeight: 320, overflowY: 'auto' }}
                  >
                    <table className="table table-sm table-hover table-striped mb-0 align-middle">
                      <thead className="sticky-top table-light">
                        <tr>
                          <th style={{ width: 60 }}>ID</th>
                          <th style={{ width: 150 }}>Fecha</th>
                          <th style={{ width: 140 }}>Cuenta</th>
                          <th className="text-end" style={{ width: 100 }}>
                            Total
                          </th>
                          <th className="text-center" style={{ width: 90 }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasFiltradas.map((v) => (
                          <tr
                            key={v.id}
                            onClick={() => handleClickVenta(v)}
                            style={{ cursor: 'pointer' }}
                            className={
                              ventaSeleccionada?.id === v.id
                                ? 'table-active'
                                : ''
                            }
                          >
                            <td className="small text-body-primary">{v.id}</td>
                            <td className="small">
                              {v.fecha ? formatFecha(v.fecha) : ''}
                            </td>
                            <td className="small">
                              {v.status === 'PRESTAMO'
                                ? v.cuenta?.nombre
                                  ? v.cuenta.nombre
                                  : v.cuentaId
                                  ? `Cuenta ${v.cuentaId}`
                                  : 'Préstamo'
                                : 'Contado'}
                            </td>
                            <td className="text-end fw-semibold text-success">
                              {formatMoney(v.total || 0)}
                            </td>
                            <td className="text-center">
                              <span
                                className={
                                  v.status === 'PRESTAMO'
                                    ? 'badge bg-warning text-dark'
                                    : 'badge bg-success-subtle text-success-emphasis border border-success-subtle'
                                }
                              >
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {ventasFiltradas.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="text-center text-body-primary py-3"
                            >
                              No hay ventas en el período seleccionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalle de venta seleccionada */}
            <div className="col-md-5 mt-3 mt-md-0">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Detalle de venta</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!ventaSeleccionada}
                    onClick={reimprimirTicket}
                  >
                    Reimprimir ticket
                  </button>
                </div>
                <div className="card-body p-2 bg-body">
                  {!ventaSeleccionada && (
                    <div className="text-muted small">
                      Selecciona una venta para ver sus productos.
                    </div>
                  )}

                  {ventaSeleccionada && (
                    <>
                      <div className="small mb-2">
                        <div>
                          <strong>Folio:</strong> {ventaSeleccionada.id}
                        </div>
                        <div>
                          <strong>Fecha:</strong>{' '}
                          {ventaSeleccionada.fecha
                            ? formatFecha(ventaSeleccionada.fecha)
                            : ''}
                        </div>
                        <div>
                          <strong>Tipo:</strong>{' '}
                          {ventaSeleccionada.status === 'PRESTAMO'
                            ? 'Préstamo'
                            : 'Contado'}
                        </div>
                        <div>
                          <strong>Total:</strong>{' '}
                          {formatMoney(totalDetalle)}
                        </div>
                        <div>
                          <strong>Pago del cliente:</strong>{' '}
                          {formatMoney(pagoDetalle)}
                        </div>
                        <div>
                          <strong>Cambio:</strong>{' '}
                          {formatMoney(cambioDetalle)}
                        </div>
                      </div>

                      <div
                        className="border rounded"
                        style={{ maxHeight: 260, overflowY: 'auto' }}
                      >
                        <table className="table table-sm table-striped mb-0 align-middle">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Producto</th>
                              <th className="text-center" style={{ width: 70 }}>
                                Cant.
                              </th>
                              <th className="text-end" style={{ width: 90 }}>
                                P. venta
                              </th>
                              <th className="text-end" style={{ width: 90 }}>
                                Costo compra
                              </th>
                              <th className="text-end" style={{ width: 90 }}>
                                Ganancia
                              </th>
                              <th className="text-end" style={{ width: 100 }}>
                                Importe
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventaSeleccionada.ventaProductos?.map((vp) => {
                              const precioVenta =
                                vp.precioUnitario ?? vp.precio ?? 0;
                              const costoCompra =
                                vp.producto?.precioCompra ?? 0;
                              const gananciaUnidad =
                                precioVenta - costoCompra;
                              const importe =
                                (vp.cantidad || 0) * precioVenta;
                              return (
                                <tr key={vp.id}>
                                  <td className="small">
                                    {vp.producto?.descripcion ||
                                      `Producto ${vp.producto?.id}`}
                                    <div className="text-muted small">
                                      Código: {vp.producto?.codigo}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {vp.cantidad}
                                  </td>
                                  <td className="text-end">
                                    {formatMoney(precioVenta)}
                                  </td>
                                  <td className="text-end">
                                    {formatMoney(costoCompra)}
                                  </td>
                                  <td className="text-end">
                                    {formatMoney(gananciaUnidad)}
                                  </td>
                                  <td className="text-end fw-semibold">
                                    {formatMoney(importe)}
                                  </td>
                                </tr>
                              );
                            })}

                            {(!ventaSeleccionada.ventaProductos ||
                              ventaSeleccionada.ventaProductos.length === 0) && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="text-center text-muted py-3"
                                >
                                  Esta venta no tiene productos asociados.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
