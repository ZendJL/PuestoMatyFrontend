import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import { imprimirTicketVenta } from '../Venta/TicketPrinter';
import DataTable from '../common/DataTable';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10);
}

function getInicioFinPeriodo(tipo) {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (tipo === 'dia') {
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
    return { desde: inicioDia, hasta: finDia };
  }
  if (tipo === 'semana') {
    const day = hoy.getDay();
    const diff = hoy.getDate() - day + (day === 0 ? -6 : 1);
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), diff);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return { desde: inicioSemana, hasta: finSemana };
  }
  if (tipo === 'mes') {
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    return { desde: inicioMes, hasta: finMes };
  }
  return { desde: inicioDia, hasta: hoy };
}

const ETIQUETA_PAGO = {
  PESOS:   '🇲🇽 Efectivo',
  TARJETA: '💳 Tarjeta',
  DOLARES: '🇺🇸 Dólares',
  MIXTO:   '🔀 Mixto',
};

const BADGE_PAGO = {
  PESOS:   'bg-success-subtle text-success-emphasis border border-success-subtle',
  TARJETA: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
  DOLARES: 'bg-info-subtle text-info-emphasis border border-info-subtle',
  MIXTO:   'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle',
};

export default function ReporteVentasGenerales() {
  const [tipoPeriodo, setTipoPeriodo]       = useState('dia');
  const { desde: dIni, hasta: dFin }        = getInicioFinPeriodo('dia');
  const [desde, setDesde]                   = useState(formatoFechaInput(dIni));
  const [hasta, setHasta]                   = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda]             = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [mostrarDesglose, setMostrarDesglose]     = useState(false);

  const { data: ventasRaw = [], isLoading, error } = useQuery({
    queryKey: ['ventas-reporte-generales', desde, hasta],
    queryFn: async () => {
      const res = await axios.get(`/api/ventas/reporte-generales?desde=${desde}&hasta=${hasta}`);
      return res.data;
    },
    enabled: !!desde && !!hasta,
  });

  const { data: productosVenta = [] } = useQuery({
    queryKey: ['productos-venta', ventaSeleccionada?.id],
    queryFn: async () => {
      const res = await axios.get(`/api/ventas/${ventaSeleccionada.id}/productos`);
      return res.data;
    },
    enabled: !!ventaSeleccionada?.id,
  });

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
      return idStr.includes(texto) || cuentaNombre.toLowerCase().includes(texto);
    });
  }, [ventas, busqueda]);

  const totalVentas   = ventasFiltradas.length;
  const totalImporte  = ventasFiltradas.reduce((sum, v) => sum + (v.total || 0), 0);
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
    imprimirTicketVenta(ventaSeleccionada.id);
  };

  if (isLoading) return <div className="text-center py-5 fs-5"><div className="spinner-border text-primary me-2" /><span>Cargando ventas...</span></div>;
  if (error)     return <div className="alert alert-danger m-3"><i className="bi bi-exclamation-triangle-fill me-2" />Error al cargar ventas</div>;

  const totalDetalle  = ventaSeleccionada ? Number(ventaSeleccionada.total || 0) : 0;
  const pagoDetalle   = ventaSeleccionada ? Number(ventaSeleccionada.pagoCliente ?? ventaSeleccionada.total ?? 0) : 0;
  const cambioDetalle = Math.max(pagoDetalle - totalDetalle, 0);

  const gananciaVentaSeleccionada = productosVenta.reduce((s, vp) => {
    const precioVenta   = vp.precioUnitario ?? 0;
    const cantidad      = vp.cantidad || 0;
    const costoTotal    = vp.costoTotal ?? 0;
    const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
    return s + cantidad * (precioVenta - costoUnitario);
  }, 0);

  const columnasVentas = [
    {
      id: 'id', header: 'ID', style: { width: 60 },
      accessor: (v) => v.id, sortable: true, filterable: true,
      filterPlaceholder: 'ID', cellClassName: 'small text-body-primary',
      defaultSortDirection: 'desc',
    },
    {
      id: 'fecha', header: 'Fecha', style: { width: 150 },
      accessor: (v) => v.fecha, sortable: true, filterable: true,
      render: (v) => (v.fecha ? formatFecha(v.fecha) : ''),
      sortFn: (a, b) => new Date(a) - new Date(b), defaultSortDirection: 'desc',
    },
    {
      id: 'cuenta', header: 'Cuenta', style: { width: 130 },
      accessor: (v) => v.status === 'PRESTAMO' ? (v.cuenta?.nombre ?? `Cuenta ${v.cuentaId ?? ''}`) || 'Préstamo' : 'Contado',
      sortable: true, filterable: true, filterPlaceholder: 'Cuenta / tipo', cellClassName: 'small',
    },
    {
      id: 'tipoPago', header: 'Tipo pago', style: { width: 120 },
      accessor: (v) => v.tipoPago ?? '', sortable: true, filterable: true,
      filterPlaceholder: 'PESOS...', headerAlign: 'center', cellClassName: 'text-center',
      render: (v) => v.tipoPago
        ? <span className={`badge ${BADGE_PAGO[v.tipoPago] ?? 'bg-secondary-subtle text-secondary-emphasis'}`}>{ETIQUETA_PAGO[v.tipoPago] ?? v.tipoPago}</span>
        : <span className="text-muted small">—</span>,
    },
    {
      id: 'total', header: 'Total', style: { width: 100 },
      headerAlign: 'right', headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold text-success',
      accessor: (v) => v.total || 0, sortable: true, filterable: true,
      filterPlaceholder: '>= 0', render: (v) => formatMoney(v.total || 0),
      sortFn: (a, b) => (a || 0) - (b || 0), defaultSortDirection: 'desc',
    },
    {
      id: 'status', header: 'Estado', style: { width: 90 },
      accessor: (v) => v.status, sortable: true, filterable: true,
      filterPlaceholder: 'PRESTAMO...', headerAlign: 'center', cellClassName: 'text-center',
      render: (v) => (
        <span className={v.status === 'PRESTAMO' ? 'badge bg-warning text-dark' : 'badge bg-success-subtle text-success-emphasis border border-success-subtle'}>
          {v.status === 'PRESTAMO' ? 'Préstamo' : 'Contado'}
        </span>
      ),
    },
  ];

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 80px)', marginBottom: '1rem' }}>

        {/* HEADER */}
        <div className="card-header py-3 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0 fw-bold"><i className="bi bi-bar-chart-line-fill me-2" />Historial de Ventas</h5>
            <small className="text-white-50">Consulta ventas de contado y préstamos en el período seleccionado.</small>
          </div>
          <div className="text-end">
            <div className="small text-white-50">Total vendido</div>
            <div className="fs-4 fw-bold">{formatMoney(totalImporte)}</div>
          </div>
        </div>

        <div className="card-body py-3">

          {/* TARJETAS RESUMEN */}
          <div className="row g-3 mb-3">
            {[
              { label: 'Ventas realizadas', value: totalVentas,                   color: 'primary',  icon: 'bi-receipt',        fmt: v => v },
              { label: 'Importe total',     value: totalImporte,                  color: 'success',  icon: 'bi-cash-stack',     fmt: formatMoney },
              { label: 'Total en préstamos', value: totalPrestamos,               color: 'warning',  icon: 'bi-person-check',   fmt: formatMoney },
              { label: `Ganancia #${ventaSeleccionada?.id || '—'}`, value: gananciaVentaSeleccionada, color: 'info', icon: 'bi-graph-up-arrow', fmt: formatMoney },
            ].map((card, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className={`card border-${card.color} border-2 h-100`}>
                  <div className="card-body py-2 px-3">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className={`bi ${card.icon} text-${card.color} fs-5`} />
                      <small className="text-muted fw-semibold text-truncate">{card.label}</small>
                    </div>
                    <div className={`fs-4 fw-bold text-${card.color}`}>{card.fmt(card.value)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FILTROS */}
          <div className="card border mb-3">
            <div className="card-header py-2 bg-body-tertiary">
              <h6 className="mb-0"><i className="bi bi-funnel me-2" />Filtros</h6>
            </div>
            <div className="card-body py-3">
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold mb-2">Período rápido</label>
                  <div className="btn-group w-100" role="group">
                    {['dia', 'semana', 'mes', 'rango'].map((t) => (
                      <button key={t} type="button"
                        className={`btn btn-outline-primary ${tipoPeriodo === t ? 'active' : ''}`}
                        onClick={() => aplicarPeriodo(t)}
                      >
                        {t === 'dia' ? 'Hoy' : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label fw-semibold mb-2">Desde</label>
                  <input type="date" className="form-control form-control-lg" value={desde} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label fw-semibold mb-2">Hasta</label>
                  <input type="date" className="form-control form-control-lg" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold mb-2">Buscar venta</label>
                  <input type="text" className="form-control form-control-lg" placeholder="ID, nombre de cuenta..."
                    value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* TABLA + DETALLE */}
          <div className="row g-3">
            {/* Tabla ventas */}
            <div className="col-12 col-md-7">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0"><i className="bi bi-list-ul me-2" />Lista de ventas</h6>
                  <span className="badge bg-primary rounded-pill fs-6">{totalVentas} ventas</span>
                </div>
                <div className="card-body p-0">
                  <DataTable
                    columns={columnasVentas}
                    data={ventasFiltradas}
                    initialSort={{ id: 'fecha', direction: 'desc' }}
                    maxHeight={300}
                    onRowClick={handleClickVenta}
                    getRowKey={(v) => v.id}
                    selectedRowKey={ventaSeleccionada?.id}
                  />
                </div>
                <div className="card-footer py-2 text-muted small">
                  <i className="bi bi-hand-index me-1" />Haz clic en una venta para ver el detalle a la derecha
                </div>
              </div>
            </div>

            {/* Detalle venta */}
            <div className="col-12 col-md-5">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">
                    <i className="bi bi-receipt me-2" />
                    {ventaSeleccionada ? `Venta #${ventaSeleccionada.id}` : 'Detalle de venta'}
                  </h6>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" disabled={!ventaSeleccionada}
                      onClick={() => setMostrarDesglose(!mostrarDesglose)}>
                      <i className={`bi ${mostrarDesglose ? 'bi-eye-slash' : 'bi-boxes'} me-1`} />
                      {mostrarDesglose ? 'Ocultar lotes' : 'Ver lotes'}
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" disabled={!ventaSeleccionada}
                      onClick={reimprimirTicket}>
                      <i className="bi bi-printer me-1" />Imprimir ticket
                    </button>
                  </div>
                </div>
                <div className="card-body p-3">
                  {!ventaSeleccionada ? (
                    <div className="text-muted text-center py-5">
                      <i className="bi bi-arrow-left-circle fs-1 opacity-50 mb-3 d-block" />
                      <div className="fs-6 fw-semibold">Selecciona una venta</div>
                      <small>Haz clic en cualquier fila de la tabla</small>
                    </div>
                  ) : (
                    <>
                      {/* Info venta */}
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Folio</div>
                            <div className="fw-bold fs-5">#{ventaSeleccionada.id}</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary text-end">
                            <div className="small text-muted">Estado</div>
                            <span className={`badge fs-6 ${ventaSeleccionada.status === 'PRESTAMO' ? 'bg-warning text-dark' : 'bg-success'}`}>
                              {ventaSeleccionada.status === 'PRESTAMO' ? 'Préstamo' : 'Contado'}
                            </span>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Fecha</div>
                            <div className="fw-semibold">{formatFecha(ventaSeleccionada.fecha)}</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Total</div>
                            <div className="fw-bold text-success fs-5">{formatMoney(totalDetalle)}</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Ganancia</div>
                            <div className="fw-bold text-primary fs-5">{formatMoney(gananciaVentaSeleccionada)}</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Tipo de pago</div>
                            {ventaSeleccionada.tipoPago
                              ? <span className={`badge ${BADGE_PAGO[ventaSeleccionada.tipoPago] ?? 'bg-secondary-subtle text-secondary-emphasis'}`}>{ETIQUETA_PAGO[ventaSeleccionada.tipoPago] ?? ventaSeleccionada.tipoPago}</span>
                              : <span className="text-muted">—</span>}
                          </div>
                        </div>
                        {ventaSeleccionada.status !== 'PRESTAMO' && cambioDetalle > 0 && (
                          <div className="col-6">
                            <div className="p-2 rounded bg-body-secondary">
                              <div className="small text-muted">Cambio</div>
                              <div className="fw-bold text-primary">{formatMoney(cambioDetalle)}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Productos */}
                      <h6 className="fw-bold mb-2"><i className="bi bi-bag me-2" />Productos ({productosVenta.length})</h6>
                      <div className="border rounded mb-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped table-hover mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Producto</th>
                              <th className="text-center" style={{ width: 50 }}>Cant.</th>
                              <th className="text-end" style={{ width: 80 }}>P/U</th>
                              <th className="text-end" style={{ width: 80 }}>Ganancia</th>
                              <th className="text-end" style={{ width: 85 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosVenta.map((vp) => {
                              const precioVenta   = vp.precioUnitario ?? 0;
                              const cantidad      = vp.cantidad || 0;
                              const costoTotal    = vp.costoTotal ?? 0;
                              const costoUnitario = cantidad > 0 ? costoTotal / cantidad : 0;
                              const gananciaProducto = (precioVenta - costoUnitario) * cantidad;
                              const importe = cantidad * precioVenta;
                              return (
                                <tr key={vp.id}>
                                  <td className="small">
                                    <div className="fw-semibold">{vp.producto?.descripcion || `Prod ${vp.producto?.id}`}</div>
                                    <small className="text-muted">{vp.producto?.codigo}</small>
                                  </td>
                                  <td className="text-center fw-bold">{cantidad}</td>
                                  <td className="text-end small">{formatMoney(precioVenta)}</td>
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
                              <tr><td colSpan={5} className="text-center text-muted py-3">Sin productos registrados</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Desglose lotes */}
                      {mostrarDesglose && (
                        <>
                          <h6 className="fw-bold mb-2 text-primary"><i className="bi bi-boxes me-2" />Costos por lote ({desgloseLotes.length})</h6>
                          <div className="border rounded" style={{ maxHeight: 160, overflowY: 'auto' }}>
                            <table className="table table-sm table-striped mb-0">
                              <thead className="table-light sticky-top">
                                <tr>
                                  <th>Producto</th>
                                  <th className="text-end" style={{ width: 60 }}>Lote</th>
                                  <th className="text-end" style={{ width: 100 }}>Fecha</th>
                                  <th className="text-end" style={{ width: 50 }}>Cant.</th>
                                  <th className="text-end" style={{ width: 75 }}>C/U</th>
                                  <th className="text-end" style={{ width: 80 }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {desgloseLotes.map((lote, idx) => (
                                  <tr key={idx}>
                                    <td className="small">{lote.productoDescripcion}</td>
                                    <td className="text-end small">#{lote.loteId}</td>
                                    <td className="text-end small">{formatFecha(lote.fechaCompra)}</td>
                                    <td className="text-end fw-bold">{lote.cantidad}</td>
                                    <td className="text-end small">{formatMoney(lote.costoUnitario)}</td>
                                    <td className="text-end fw-bold text-danger">{formatMoney(lote.costoTotal)}</td>
                                  </tr>
                                ))}
                                {desgloseLotes.length === 0 && (
                                  <tr><td colSpan={6} className="text-center text-muted small py-2">Sin lotes</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
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
