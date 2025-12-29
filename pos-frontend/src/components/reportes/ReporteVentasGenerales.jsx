import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import { imprimirTicketVenta } from '../Venta/TicketPrinter';
import DataTable from '../common/DataTable';

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
  const [mostrarDesglose, setMostrarDesglose] = useState(false);

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

    let lista = ventas.filter((v) => {
      if (!v.fecha) return false;
      const f = new Date(v.fecha);
      return f >= dDesde && f <= dHasta;
    });

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

  // Ganancia total del período (usa costoTotal de venta_productos)
  const gananciaTotalGeneral = ventasFiltradas.reduce((acum, v) => {
    const gananciaVenta = (v.ventaProductos || []).reduce((s, vp) => {
      const precioVenta = vp.precioUnitario ?? vp.precio ?? 0;
      const cantidad = vp.cantidad || 0;
      const costoTotal = vp.costoTotal ?? vp.costo_total ?? 0;
      const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
      const gananciaUnidad = precioVenta - costoUnitario;
      return s + cantidad * gananciaUnidad;
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
    setMostrarDesglose(false);
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

  // Carga del desglose por lotes cuando se pide
  const { data: desgloseLotes = [] } = useQuery({
    queryKey: ['costos-lotes', ventaSeleccionada?.id],
    queryFn: async () => {
      const res = await axios.get(
        `/api/ventas/${ventaSeleccionada.id}/costos-lotes`
      );
      return res.data;
    },
    enabled: !!ventaSeleccionada?.id && mostrarDesglose,
  });

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
        ventaSeleccionada.pagoCliente ?? ventaSeleccionada.total ?? 0
      )
    : 0;
  const cambioDetalle = Math.max(pagoDetalle - totalDetalle, 0);

  // Ganancia SOLO de la venta seleccionada
  const gananciaVentaSeleccionada = ventaSeleccionada
    ? (ventaSeleccionada.ventaProductos || []).reduce((s, vp) => {
        const precioVenta = vp.precioUnitario ?? vp.precio ?? 0;
        const cantidad = vp.cantidad || 0;
        const costoTotal = vp.costoTotal ?? vp.costo_total ?? 0;
        const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
        const gananciaUnidad = precioVenta - costoUnitario;
        return s + cantidad * gananciaUnidad;
      }, 0)
    : 0;

  const columnasVentas = [
    {
      id: 'id',
      header: 'ID',
      style: { width: 60 },
      accessor: (v) => v.id,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'ID',
      cellClassName: 'small text-body-primary',
      defaultSortDirection: 'desc',
    },
    {
      id: 'fecha',
      header: 'Fecha',
      style: { width: 150 },
      accessor: (v) => v.fecha,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'AAAA-MM-DD',
      render: (v) => (v.fecha ? formatFecha(v.fecha) : ''),
      sortFn: (a, b) => new Date(a) - new Date(b),
      defaultSortDirection: 'desc',
    },
    {
      id: 'cuenta',
      header: 'Cuenta',
      style: { width: 140 },
      accessor: (v) =>
        v.status === 'PRESTAMO'
          ? v.cuenta?.nombre
            ? v.cuenta.nombre
            : v.cuentaId
            ? `Cuenta ${v.cuentaId}`
            : 'Préstamo'
          : 'Contado',
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Cuenta / tipo',
      cellClassName: 'small',
    },
    {
      id: 'total',
      header: 'Total',
      style: { width: 100 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold text-success',
      accessor: (v) => v.total || 0,
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (v) => formatMoney(v.total || 0),
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
    },
    {
      id: 'status',
      header: 'Status',
      style: { width: 90 },
      accessor: (v) => v.status,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'PRESTAMO...',
      headerAlign: 'center',
      cellClassName: 'text-center',
      render: (v) => (
        <span
          className={
            v.status === 'PRESTAMO'
              ? 'badge bg-warning text-dark'
              : 'badge bg-success-subtle text-success-emphasis border border-success-subtle'
          }
        >
          {v.status}
        </span>
      ),
    },
  ];

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
                    Clic en encabezados para ordenar y usa los filtros por
                    columna.
                  </small>
                </div>
                <div className="card-body p-0 bg-body">
                  <DataTable
                    columns={columnasVentas}
                    data={ventasFiltradas}
                    initialSort={{ id: 'fecha', direction: 'desc' }}
                    maxHeight={320}
                    onRowClick={handleClickVenta}
                    getRowKey={(v) => v.id}
                    selectedRowKey={ventaSeleccionada?.id}
                  />
                </div>
              </div>
            </div>

            {/* Detalle de venta seleccionada */}
            <div className="col-md-5 mt-3 mt-md-0">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Detalle de venta</h6>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={!ventaSeleccionada}
                      onClick={() =>
                        setMostrarDesglose((v) => !v)
                      }
                    >
                      {mostrarDesglose
                        ? 'Ocultar desglose'
                        : 'Ver desglose costos'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={!ventaSeleccionada}
                      onClick={reimprimirTicket}
                    >
                      Reimprimir ticket
                    </button>
                  </div>
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
                          <strong>Total venta:</strong>{' '}
                          {formatMoney(totalDetalle)}
                        </div>
                        <div>
                          <strong>Ganancia total:</strong>{' '}
                          {formatMoney(gananciaVentaSeleccionada)}
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
                              <th className="text-end" style={{ width: 110 }}>
                                Ganancia producto
                              </th>
                              <th className="text-end" style={{ width: 110 }}>
                                Importe
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventaSeleccionada.ventaProductos?.map((vp) => {
                              const precioVenta =
                                vp.precioUnitario ?? vp.precio ?? 0;
                              const cantidad = vp.cantidad || 0;
                              const costoTotal =
                                vp.costoTotal ?? vp.costo_total ?? 0;
                              const costoUnitario =
                                cantidad > 0 ? costoTotal / cantidad : 0;
                              const gananciaUnidad =
                                precioVenta - costoUnitario;
                              const gananciaProducto =
                                gananciaUnidad * cantidad;
                              const importe = cantidad * precioVenta;

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
                                    {cantidad}
                                  </td>
                                  <td className="text-end">
                                    {formatMoney(precioVenta)}
                                  </td>
                                  <td className="text-end">
                                    <span
                                      className={
                                        gananciaProducto >= 0
                                          ? 'text-success fw-semibold'
                                          : 'text-danger fw-semibold'
                                      }
                                    >
                                      {formatMoney(gananciaProducto)}
                                    </span>
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
                                  colSpan={5}
                                  className="text-center text-muted py-3"
                                >
                                  Esta venta no tiene productos asociados.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {mostrarDesglose && (
                        <div className="mt-2">
                          <div className="small fw-semibold mb-1">
                            Desglose de costos por lotes
                          </div>
                          <div
                            className="border rounded bg-body"
                            style={{ maxHeight: 200, overflowY: 'auto' }}
                          >
                            <table className="table table-sm table-striped mb-0 align-middle">
                              <thead className="table-light sticky-top">
                                <tr>
                                  <th>Producto</th>
                                  <th
                                    className="text-end"
                                    style={{ width: 90 }}
                                  >
                                    Lote ID
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ width: 130 }}
                                  >
                                    Fecha compra
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ width: 90 }}
                                  >
                                    Cant.
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ width: 100 }}
                                  >
                                    Costo unit.
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ width: 110 }}
                                  >
                                    Costo total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {desgloseLotes.map((lote, idx) => (
                                  <tr key={idx}>
                                    <td className="small">
                                      {lote.productoDescripcion}
                                    </td>
                                    <td className="text-end">
                                      {lote.loteId}
                                    </td>
                                    <td className="text-end">
                                      {lote.fechaCompra
                                        ? formatFecha(lote.fechaCompra)
                                        : ''}
                                    </td>
                                    <td className="text-end">
                                      {lote.cantidad}
                                    </td>
                                    <td className="text-end">
                                      {formatMoney(
                                        lote.costoUnitario || 0
                                      )}
                                    </td>
                                    <td className="text-end">
                                      {formatMoney(
                                        lote.costoTotal || 0
                                      )}
                                    </td>
                                  </tr>
                                ))}

                                {desgloseLotes.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      className="text-center text-muted small py-2"
                                    >
                                      No hay desglose de costos disponible para
                                      esta venta.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
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
