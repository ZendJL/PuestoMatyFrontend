import { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import { imprimirTicketVenta } from '../Venta/TicketPrinter';
import DataTable from '../common/DataTable';

export default function ReporteDeudas() {
  const [busqueda, setBusqueda]                 = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada]   = useState(null);

  const { data: cuentasRaw = [], isLoading, error } = useQuery({
    queryKey: ['cuentas-resumen-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas/resumen');
      return res.data;
    },
  });

  const { data: productosVenta = [], isLoading: loadingProductos } = useQuery({
    queryKey: ['productos-venta-deuda', ventaSeleccionada?.ventaId],
    enabled: !!ventaSeleccionada?.ventaId,
    queryFn: async () => {
      const res = await axios.get(`/api/ventas/${ventaSeleccionada.ventaId}/productos`);
      return res.data;
    },
  });

  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];

  const cuentasConDeuda = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return cuentas
      .filter((c) => (c.saldo || 0) > 0)
      .filter((c) =>
        texto ? c.nombre?.toLowerCase().includes(texto) || c.descripcion?.toLowerCase().includes(texto) : true
      );
  }, [cuentas, busqueda]);

  const ventasDeCuenta = useMemo(() => {
    if (!cuentaSeleccionada?.ultimasVentas) return [];
    return (cuentaSeleccionada.ultimasVentas || []).filter(v => v.status === 'PRESTAMO');
  }, [cuentaSeleccionada]);

  const totalDeudores = cuentasConDeuda.length;
  const totalDeuda    = cuentasConDeuda.reduce((sum, c) => sum + (c.saldo || 0), 0);

  if (isLoading) return <div className="text-center py-5 fs-5"><div className="spinner-border text-primary me-2" /><span>Cargando deudas...</span></div>;
  if (error)     return <div className="alert alert-danger m-3"><i className="bi bi-exclamation-triangle-fill me-2" />Error al cargar deudas</div>;

  const columnasCuentas = [
    {
      id: 'id', header: 'ID', style: { width: 70 },
      accessor: (c) => c.id, sortable: true, filterable: true,
      filterPlaceholder: 'ID', cellClassName: 'text-body-primary small', defaultSortDirection: 'asc',
    },
    {
      id: 'nombre', header: 'Cliente',
      accessor: (c) => c.nombre, sortable: true, filterable: true, filterPlaceholder: 'Nombre',
      render: (c) => (
        <div>
          <div className="fw-semibold">{c.nombre}</div>
          {c.descripcion && <small className="text-muted">{c.descripcion}</small>}
        </div>
      ),
    },
    {
      id: 'totalFacturado', header: 'Vendido', style: { width: 115 },
      headerAlign: 'right', cellClassName: 'text-end fw-semibold text-success',
      accessor: (c) => c.totalFacturado || 0, sortable: true,
      render: (c) => formatMoney(c.totalFacturado || 0),
    },
    {
      id: 'saldo', header: 'Deuda pendiente', style: { width: 140 },
      headerAlign: 'right', cellClassName: 'text-end',
      accessor: (c) => c.saldo || 0, sortable: true, filterable: true,
      render: (c) => (
        <span className="badge bg-danger fs-6 fw-bold">{formatMoney(c.saldo || 0)}</span>
      ),
      sortFn: (a, b) => (a || 0) - (b || 0), defaultSortDirection: 'desc',
    },
  ];

  const columnasVentas = [
    {
      id: 'ventaId', header: 'Folio', style: { width: 70 },
      accessor: (v) => v.ventaId || v.id, sortable: true, cellClassName: 'fw-semibold small',
    },
    {
      id: 'fecha', header: 'Fecha', style: { width: 140 },
      accessor: (v) => v.fecha, sortable: true,
      render: (v) => formatFecha(v.fecha),
      sortFn: (a, b) => new Date(a) - new Date(b), defaultSortDirection: 'desc',
    },
    {
      id: 'totalVenta', header: 'Total', style: { width: 110 },
      headerAlign: 'right', cellClassName: 'text-end fw-bold text-success',
      accessor: (v) => v.totalVenta || v.total || 0, sortable: true,
      render: (v) => formatMoney(v.totalVenta || v.total || 0),
    },
    {
      id: 'status', header: 'Estado', style: { width: 100 },
      accessor: (v) => v.status,
      render: () => <span className="badge bg-warning text-dark fs-6">Préstamo</span>,
    },
  ];

  const columnasProductos = [
    {
      id: 'producto', header: 'Producto',
      accessor: (vp) => vp.producto?.descripcion || '',
      render: (vp) => (
        <>
          <div className="fw-semibold">{vp.producto?.descripcion || `Prod ${vp.producto?.id}`}</div>
          {vp.producto?.codigo && <div className="text-body-primary small">Cód: {vp.producto.codigo}</div>}
        </>
      ),
    },
    {
      id: 'cantidad', header: 'Cant.', style: { width: 70 },
      headerAlign: 'center', cellClassName: 'text-center fw-bold',
      accessor: (vp) => vp.cantidad || 0,
    },
    {
      id: 'precioUnitario', header: 'P/U', style: { width: 100 },
      headerAlign: 'right', cellClassName: 'text-end',
      accessor: (vp) => vp.precioUnitario || 0,
      render: (vp) => formatMoney(vp.precioUnitario || 0),
    },
    {
      id: 'importe', header: 'Total', style: { width: 110 },
      headerAlign: 'right', cellClassName: 'text-end fw-bold text-success',
      accessor: (vp) => (vp.cantidad || 0) * (vp.precioUnitario || 0),
      render: (vp) => formatMoney((vp.cantidad || 0) * (vp.precioUnitario || 0)),
    },
  ];

  const handleImprimirTicket = () => {
    if (!ventaSeleccionada?.ventaId) return;
    imprimirTicketVenta(ventaSeleccionada.ventaId);
  };

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 80px)', marginBottom: '1rem' }}>

        {/* HEADER */}
        <div className="card-header py-3 d-flex justify-content-between align-items-center bg-danger text-white">
          <div>
            <h5 className="mb-0 fw-bold"><i className="bi bi-person-exclamation me-2" />Reporte de Deudas</h5>
            <small className="text-white-50">Cuentas con saldo pendiente y sus ventas a crédito.</small>
          </div>
          <div className="text-end">
            <div className="small text-white-50">{totalDeudores} deudor{totalDeudores !== 1 ? 'es' : ''}</div>
            <div className="fs-4 fw-bold">{formatMoney(totalDeuda)}</div>
          </div>
        </div>

        <div className="card-body py-3">

          {/* TARJETAS RESUMEN */}
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <div className="card border-danger border-2 h-100">
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-people-fill text-danger fs-5" />
                    <small className="text-muted fw-semibold">Total deudores</small>
                  </div>
                  <div className="fs-4 fw-bold text-danger">{totalDeudores}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-warning border-2 h-100">
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-cash-stack text-warning fs-5" />
                    <small className="text-muted fw-semibold">Deuda total</small>
                  </div>
                  <div className="fs-4 fw-bold text-warning">{formatMoney(totalDeuda)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* Columna izquierda: lista de cuentas */}
            <div className="col-12 col-md-5">
              <div className="card h-100">
                <div className="card-header py-2 bg-body-tertiary">
                  <h6 className="mb-0"><i className="bi bi-people me-2" />Clientes con deuda</h6>
                </div>
                <div className="card-body p-3">
                  <label className="form-label fw-semibold mb-2">🔍 Buscar cliente</label>
                  <input
                    type="text"
                    className="form-control form-control-lg mb-3"
                    placeholder="Nombre o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  <div className="border rounded">
                    <DataTable
                      columns={columnasCuentas}
                      data={cuentasConDeuda}
                      initialSort={{ id: 'saldo', direction: 'desc' }}
                      maxHeight={340}
                      onRowClick={(c) => {
                        setCuentaSeleccionada(cuentaSeleccionada?.id === c.id ? null : c);
                        setVentaSeleccionada(null);
                      }}
                      getRowKey={(c) => c.id}
                      selectedRowKey={cuentaSeleccionada?.id}
                    />
                  </div>
                  <div className="mt-2 text-muted small text-center">
                    <i className="bi bi-hand-index me-1" />Selecciona un cliente para ver sus préstamos
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: detalle */}
            <div className="col-12 col-md-7">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">
                    {cuentaSeleccionada
                      ? <><i className="bi bi-person-fill me-2 text-danger" />{cuentaSeleccionada.nombre}</>
                      : <><i className="bi bi-info-circle me-2" />Detalle de cuenta</>}
                  </h6>
                  {cuentaSeleccionada && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => { setCuentaSeleccionada(null); setVentaSeleccionada(null); }}>
                      <i className="bi bi-x me-1" />Quitar selección
                    </button>
                  )}
                </div>
                <div className="card-body p-3">
                  {!cuentaSeleccionada ? (
                    <div className="text-muted text-center py-5">
                      <i className="bi bi-arrow-left-circle fs-1 opacity-50 mb-3 d-block" />
                      <div className="fs-6 fw-semibold">Selecciona un cliente</div>
                      <small>Haz clic en cualquier fila de la tabla</small>
                    </div>
                  ) : (
                    <>
                      {/* Resumen cuenta */}
                      <div className="row g-2 mb-3">
                        <div className="col-4">
                          <div className="p-2 rounded bg-body-secondary text-center">
                            <div className="small text-muted">Vendido</div>
                            <div className="fw-bold text-success">{formatMoney(cuentaSeleccionada.totalFacturado)}</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="p-2 rounded bg-body-secondary text-center">
                            <div className="small text-muted">Pagado</div>
                            <div className="fw-bold text-primary">{formatMoney(cuentaSeleccionada.totalPagado)}</div>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="p-2 rounded bg-danger bg-opacity-10 text-center border border-danger border-opacity-25">
                            <div className="small text-muted">Deuda pendiente</div>
                            <div className="fw-bold text-danger fs-5">{formatMoney(cuentaSeleccionada.saldo)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Ventas a crédito */}
                      <h6 className="fw-bold mb-2"><i className="bi bi-receipt me-2" />Ventas a crédito ({ventasDeCuenta.length})</h6>
                      <div className="border rounded mb-3">
                        <DataTable
                          columns={columnasVentas}
                          data={ventasDeCuenta}
                          initialSort={{ id: 'fecha', direction: 'desc' }}
                          maxHeight={180}
                          onRowClick={(v) => setVentaSeleccionada(ventaSeleccionada?.ventaId === v.ventaId ? null : v)}
                          getRowKey={(v) => v.ventaId || v.id}
                          selectedRowKey={ventaSeleccionada?.ventaId}
                        />
                      </div>
                      <div className="mb-3 text-muted small text-center">
                        <i className="bi bi-hand-index me-1" />Selecciona una venta para ver sus productos
                      </div>

                      {/* Detalle venta seleccionada */}
                      {ventaSeleccionada && (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0"><i className="bi bi-bag me-2" />Venta #{ventaSeleccionada.ventaId || ventaSeleccionada.id}</h6>
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-outline-primary" onClick={handleImprimirTicket}>
                                <i className="bi bi-printer me-1" />Imprimir ticket
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => setVentaSeleccionada(null)}>
                                <i className="bi bi-x me-1" />Cerrar
                              </button>
                            </div>
                          </div>
                          <div className="border rounded">
                            {loadingProductos ? (
                              <div className="p-3 text-center">
                                <div className="spinner-border spinner-border-sm me-2" />Cargando productos...
                              </div>
                            ) : productosVenta.length > 0 ? (
                              <DataTable columns={columnasProductos} data={productosVenta} maxHeight={180} striped small />
                            ) : (
                              <div className="p-3 text-center text-muted small">Sin productos registrados</div>
                            )}
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
