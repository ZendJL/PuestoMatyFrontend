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

  // ✅ QUERY 1: Lista ventas OPTIMIZADA (1 query)
  const { data: ventasRaw = [], isLoading, error } = useQuery({
    queryKey: ['ventas-reporte-generales', desde, hasta],
    queryFn: async () => {
      const res = await axios.get(
        `/api/ventas/reporte-generales?desde=${desde}&hasta=${hasta}`
      );
      return res.data;
    },
    enabled: !!desde && !!hasta,
  });

  // ✅ QUERY 2: Productos de venta seleccionada (1 query al clic)
  const { data: productosVenta = [] } = useQuery({
    queryKey: ['productos-venta', ventaSeleccionada?.id],
    queryFn: async () => {
      const res = await axios.get(`/api/ventas/${ventaSeleccionada.id}/productos`);
      return res.data;
    },
    enabled: !!ventaSeleccionada?.id,
  });

  // ✅ QUERY 3: Desglose lotes OPTIMIZADO (1 query al clic)
  const { data: desgloseLotes = [] } = useQuery({
    queryKey: ['costos-lotes-opt', ventaSeleccionada?.id],
    queryFn: async () => {
      const res = await axios.get(`/api/ventas/${ventaSeleccionada.id}/costos-lotes-optimizado`);
      return res.data;
    },
    enabled: !!ventaSeleccionada?.id && mostrarDesglose,
  });

  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

  const ventasFiltradas = useMemo(() => {
    if (!ventas.length) return [];

    const texto = busqueda.toLowerCase();
    return ventas.filter((v) => {
      const idStr = String(v.id ?? '');
      const cuentaNombre = v.cuenta?.nombre ?? '';
      return (
        idStr.includes(texto) ||
        cuentaNombre.toLowerCase().includes(texto)
      );
    });
  }, [ventas, busqueda]);

  const totalVentas = ventasFiltradas.length;
  const totalImporte = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
  const totalPrestamos = ventasFiltradas
    .filter((v) => v.status === 'PRESTAMO')
    .reduce((sum, v) => sum + (v.total || 0), 0);

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
  console.log(ventaSeleccionada.id);
 imprimirTicketVenta(ventaSeleccionada.id);
 /* const total = Number(ventaSeleccionada.total || 0);
  const pagoCliente = Number(ventaSeleccionada.pagoCliente ?? ventaSeleccionada.total ?? 0);
  const cambio = Math.max(pagoCliente - total, 0);

  imprimirTicketVenta(ventaSeleccionada, {
    total,
    pagoCliente,
    cambio,
    modoPrestamo: ventaSeleccionada.status === 'PRESTAMO',
    cuentaSeleccionada: ventaSeleccionada.cuenta || null,
    productosVenta  // ✅ PASAR productosVenta al ticket
  });*/
};


  if (isLoading) {
    return <div className="fs-6 text-center py-5">Cargando ventas...</div>;
  }
  if (error) {
    return <div className="text-danger fs-6 text-center py-5">Error al cargar ventas</div>;
  }

  const totalDetalle = ventaSeleccionada ? Number(ventaSeleccionada.total || 0) : 0;
  const pagoDetalle = ventaSeleccionada ? Number(ventaSeleccionada.pagoCliente ?? ventaSeleccionada.total ?? 0) : 0;
  const cambioDetalle = Math.max(pagoDetalle - totalDetalle, 0);

  // ✅ Ganancia con productos optimizados
  const gananciaVentaSeleccionada = productosVenta.reduce((s, vp) => {
    const precioVenta = vp.precioUnitario ?? 0;
    const cantidad = vp.cantidad || 0;
    const costoTotal = vp.costoTotal ?? 0;
    const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
    const gananciaUnidad = precioVenta - costoUnitario;
    return s + cantidad * gananciaUnidad;
  }, 0);

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
          ? (v.cuenta?.nombre ?? `Cuenta ${v.cuentaId ?? ''}`) || 'Préstamo'
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
            <div className="fs-5 fw-bold">{formatMoney(totalImporte)}</div>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          {/* Resumen KPIs */}
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
                <div className="fs-5 fw-bold text-success">{formatMoney(totalImporte)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Préstamos</div>
                <div className="fs-5 fw-bold text-warning">{formatMoney(totalPrestamos)}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Ganancia venta #{ventaSeleccionada?.id || ''}</div>
                <div className="fs-5 fw-bold text-primary">{formatMoney(gananciaVentaSeleccionada)}</div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="border rounded p-2 mb-3 bg-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label mb-1 small">Período rápido</label>
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${tipoPeriodo === 'dia' ? 'active' : ''}`}
                    onClick={() => aplicarPeriodo('dia')}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${tipoPeriodo === 'semana' ? 'active' : ''}`}
                    onClick={() => aplicarPeriodo('semana')}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${tipoPeriodo === 'mes' ? 'active' : ''}`}
                    onClick={() => aplicarPeriodo('mes')}
                  >
                    Mes
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${tipoPeriodo === 'rango' ? 'active' : ''}`}
                    onClick={() => aplicarPeriodo('rango')}
                  >
                    Rango
                  </button>
                </div>
              </div>

              <div className="col-auto">
                <label className="form-label mb-1 small">Desde</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <label className="form-label mb-1 small">Hasta</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label mb-1 small">Buscar venta</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="ID, nombre de cuenta..."
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
                  <h6 className="mb-0">
                    <i className="bi bi-list-ul me-2" />Ventas
                  </h6>
                  <small className="text-body-primary">
                    Clic para ver detalle • {totalVentas} ventas encontradas
                  </small>
                </div>
                <div className="card-body p-0">
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

            {/* Detalle de venta */}
            <div className="col-md-5 mt-3 mt-md-0">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">
                    <i className="bi bi-receipt me-2" />Venta #{ventaSeleccionada?.id || ''}
                  </h6>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={!ventaSeleccionada}
                      onClick={() => setMostrarDesglose(!mostrarDesglose)}
                    >
                      {mostrarDesglose ? '← Ocultar lotes' : 'Ver lotes'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={!ventaSeleccionada}
                      onClick={reimprimirTicket}
                    >
                      <i className="bi bi-printer" /> Ticket
                    </button>
                  </div>
                </div>
                <div className="card-body p-2">
                  {!ventaSeleccionada && (
                    <div className="text-muted small text-center py-4">
                      <i className="bi bi-arrow-right-circle fs-1 opacity-50 mb-2 d-block" />
                      Selecciona una venta para ver productos
                    </div>
                  )}

                  {ventaSeleccionada && (
                    <>
                      {/* Resumen venta */}
                      <div className="small mb-3 p-2  rounded">
                        <div className="row g-2 mb-2">
                          <div className="col-6">
                            <strong>Folio:</strong> {ventaSeleccionada.id}
                          </div>
                          <div className="col-6 text-end">
                            <span className={`badge fs-6 ${ventaSeleccionada.status === 'PRESTAMO' ? 'bg-warning text-dark' : 'bg-success'}`}>
                              {ventaSeleccionada.status === 'PRESTAMO' ? 'Préstamo' : 'Contado'}
                            </span>
                          </div>
                          <div className="col-12">
                            <strong>Fecha:</strong> {formatFecha(ventaSeleccionada.fecha)}
                          </div>
                          <div className="col-6">
                            <strong>Total:</strong> {formatMoney(totalDetalle)}
                          </div>
                          <div className="col-6 text-end">
                            <strong>Ganancia:</strong> <span className="text-success fw-bold">{formatMoney(gananciaVentaSeleccionada)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Productos */}
                      <div className="border rounded mb-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Producto</th>
                              <th className="text-center" style={{ width: 60 }}>Cant.</th>
                              <th className="text-end" style={{ width: 80 }}>P/U</th>
                              <th className="text-end" style={{ width: 90 }}>Ganancia</th>
                              <th className="text-end" style={{ width: 90 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosVenta.map((vp) => {
                              const precioVenta = vp.precioUnitario ?? 0;
                              const cantidad = vp.cantidad || 0;
                              const costoTotal = vp.costoTotal ?? 0;
                              const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
                              const gananciaUnidad = precioVenta - costoUnitario;
                              const gananciaProducto = gananciaUnidad * cantidad;
                              const importe = cantidad * precioVenta;

                              return (
                                <tr key={vp.id}>
                                  <td className="pe-0 small">
                                    <div>{vp.producto?.descripcion || `Prod ${vp.producto?.id}`}</div>
                                    <small className="text-muted">{vp.producto?.codigo}</small>
                                  </td>
                                  <td className="text-center fw-bold">{cantidad}</td>
                                  <td className="text-end small">${precioVenta.toFixed(2)}</td>
                                  <td className="text-end">
                                    <span className={gananciaProducto >= 0 ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
                                      {formatMoney(gananciaProducto)}
                                    </span>
                                  </td>
                                  <td className="text-end fw-bold text-success">{formatMoney(importe)}</td>
                                </tr>
                              );
                            })}

                            {productosVenta.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center text-muted py-3">
                                  Sin productos en esta venta
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Desglose lotes */}
                      {mostrarDesglose && (
                        <div className="mt-2">
                          <div className="small fw-semibold mb-1 text-primary">
                            📦 Desglose costos por lotes ({desgloseLotes.length})
                          </div>
                          <div className="border rounded bg-body" style={{ maxHeight: 180, overflowY: 'auto' }}>
                            <table className="table table-sm table-striped mb-0">
                              <thead className="table-light sticky-top">
                                <tr>
                                  <th>Producto</th>
                                  <th className="text-end" style={{ width: 70 }}>Lote</th>
                                  <th className="text-end" style={{ width: 110 }}>Fecha compra</th>
                                  <th className="text-end" style={{ width: 60 }}>Cant.</th>
                                  <th className="text-end" style={{ width: 80 }}>C/U</th>
                                  <th className="text-end" style={{ width: 90 }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {desgloseLotes.map((lote, idx) => (
                                  <tr key={idx}>
                                    <td className="pe-0 small">{lote.productoDescripcion}</td>
                                    <td className="text-end small">#{lote.loteId}</td>
                                    <td className="text-end small">{formatFecha(lote.fechaCompra)}</td>
                                    <td className="text-end fw-bold">{lote.cantidad}</td>
                                    <td className="text-end small">{formatMoney(lote.costoUnitario)}</td>
                                    <td className="text-end fw-bold text-danger">{formatMoney(lote.costoTotal)}</td>
                                  </tr>
                                ))}

                                {desgloseLotes.length === 0 && (
                                  <tr>
                                    <td colSpan={6} className="text-center text-muted small py-2">
                                      Sin lotes en esta venta
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
