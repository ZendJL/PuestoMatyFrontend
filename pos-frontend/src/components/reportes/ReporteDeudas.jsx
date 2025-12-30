import { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import { imprimirTicketVenta } from '../Venta/TicketPrinter';  // ✅ Import ticket
import DataTable from '../common/DataTable';

export default function ReporteDeudas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // ✅ QUERY 1: Resumen optimizado
  const { data: cuentasRaw = [], isLoading, error } = useQuery({
    queryKey: ['cuentas-resumen-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas/resumen');
      return res.data;
    },
  });

  // ✅ QUERY 2: Productos venta (al clic)
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
        texto
          ? c.nombre?.toLowerCase().includes(texto) ||
            c.descripcion?.toLowerCase().includes(texto)
          : true
      );
  }, [cuentas, busqueda]);

  // ✅ FIX: Ventas de cuenta usando ultimasVentas
  const ventasDeCuenta = useMemo(() => {
    if (!cuentaSeleccionada?.ultimasVentas) return [];
    return (cuentaSeleccionada.ultimasVentas || []).filter(v => 
      v.status === 'PRESTAMO'
    );
  }, [cuentaSeleccionada]);

  const totalDeudores = cuentasConDeuda.length;
  const totalDeuda = cuentasConDeuda.reduce((sum, c) => sum + (c.saldo || 0), 0);

  if (isLoading) {
    return <div className="fs-6 text-center py-5">Cargando deudas...</div>;
  }
  if (error) {
    return <div className="text-danger fs-6 text-center py-5">Error al cargar deudas</div>;
  }

  const columnasCuentas = [
    {
      id: 'id',
      header: 'ID',
      style: { width: 70 },
      accessor: (c) => c.id,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'ID',
      headerAlign: 'left',
      cellClassName: 'text-body-primary small',
      defaultSortDirection: 'asc',
    },
    {
      id: 'nombre',
      header: 'Cliente',
      accessor: (c) => c.nombre,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Nombre',
      render: (c) => (
        <div>
          <div className="fw-semibold">{c.nombre}</div>
          {c.descripcion && <small className="text-muted">{c.descripcion}</small>}
        </div>
      ),
    },
    {
      id: 'totalFacturado',
      header: 'Vendido',
      style: { width: 120 },
      headerAlign: 'right',
      cellClassName: 'text-end fw-semibold text-success',
      accessor: (c) => c.totalFacturado || 0,
      sortable: true,
      render: (c) => formatMoney(c.totalFacturado || 0),
    },
    {
      id: 'saldo',
      header: 'Deuda',
      style: { width: 130 },
      headerAlign: 'right',
      cellClassName: 'text-end',
      accessor: (c) => c.saldo || 0,
      sortable: true,
      filterable: true,
      render: (c) => (
        <span className="badge bg-primary fs-6 fw-bold">  {/* ✅ Azul */}
          {formatMoney(c.saldo || 0)}
        </span>
      ),
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
    },
  ];

  // ✅ FIX: Columnas ventas - usar ventaId correctamente
  const columnasVentas = [
    {
      id: 'ventaId',
      header: 'Folio',
      style: { width: 70 },
      accessor: (v) => v.ventaId || v.id,  // ✅ FIX: soporta ambos formatos
      sortable: true,
      cellClassName: 'fw-semibold small',
    },
    {
      id: 'fecha',
      header: 'Fecha',
      style: { width: 140 },
      accessor: (v) => v.fecha,
      sortable: true,
      render: (v) => formatFecha(v.fecha),
      sortFn: (a, b) => new Date(a) - new Date(b),
      defaultSortDirection: 'desc',
    },
    {
      id: 'totalVenta',
      header: 'Total',
      style: { width: 110 },
      headerAlign: 'right',
      cellClassName: 'text-end fw-bold text-success',
      accessor: (v) => v.totalVenta || v.total || 0,  // ✅ FIX: soporta ambos
      sortable: true,
      render: (v) => formatMoney(v.totalVenta || v.total || 0),
    },
    {
      id: 'status',
      header: 'Estado',
      style: { width: 100 },
      accessor: (v) => v.status,
      render: (v) => (
        <span className="badge bg-warning text-dark fs-6">
          Préstamo
        </span>
      ),
    },
  ];

  const columnasProductos = [
    {
      id: 'producto',
      header: 'Producto',
      accessor: (vp) => vp.producto?.descripcion || '',
      render: (vp) => (
        <>
          {vp.producto?.descripcion || `Prod ${vp.producto?.id}`}
          {vp.producto?.codigo && (
            <div className="text-body-primary small">Cód: {vp.producto.codigo}</div>
          )}
        </>
      ),
    },
    {
      id: 'cantidad',
      header: 'Cant.',
      style: { width: 70 },
      headerAlign: 'center',
      cellClassName: 'text-center fw-bold',
      accessor: (vp) => vp.cantidad || 0,
    },
    {
      id: 'precioUnitario',
      header: 'P/U',
      style: { width: 100 },
      headerAlign: 'right',
      cellClassName: 'text-end',
      accessor: (vp) => vp.precioUnitario || 0,
      render: (vp) => formatMoney(vp.precioUnitario || 0),
    },
    {
      id: 'importe',
      header: 'Total',
      style: { width: 110 },
      headerAlign: 'right',
      cellClassName: 'text-end fw-bold text-success',
      accessor: (vp) => (vp.cantidad || 0) * (vp.precioUnitario || 0),
      render: (vp) => formatMoney((vp.cantidad || 0) * (vp.precioUnitario || 0)),
    },
  ];

  // ✅ Función imprimir ticket
  const handleImprimirTicket = () => {
    if (!ventaSeleccionada?.ventaId) return;
    imprimirTicketVenta(ventaSeleccionada.ventaId);  // ✅ Solo ID
  };

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
        {/* ✅ HEADER AZUL */}
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">💳 Reporte de Deudas</h5>
            <small className="text-white-50">
              Cuentas con saldo pendiente y sus ventas a crédito.
            </small>
          </div>
          <div className="text-end">
            <div className="text-white-50 small">
              {totalDeudores} deudor{totalDeudores !== 1 ? 'es' : ''}
            </div>
            <div className="fs-5 fw-bold text-warning">
              {formatMoney(totalDeuda)}
            </div>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          <div className="row g-3">
            {/* Columna izquierda: cuentas */}
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-end mb-3">
                <div className="flex-grow-1 me-2">
                  <label className="form-label mb-1 small fw-semibold">🔍 Buscar cliente</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Nombre o descripción..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="text-body-primary small">
                  {totalDeudores} cuentas
                </div>
              </div>

              <div className="border rounded bg-body">
                <DataTable
                  columns={columnasCuentas}
                  data={cuentasConDeuda}
                  initialSort={{ id: 'saldo', direction: 'desc' }}
                  maxHeight={400}
                  onRowClick={(c) => {
                    setCuentaSeleccionada(cuentaSeleccionada?.id === c.id ? null : c);
                    setVentaSeleccionada(null);
                  }}
                  getRowKey={(c) => c.id}
                  selectedRowKey={cuentaSeleccionada?.id}
                />
              </div>
            </div>

            {/* Columna derecha: detalle */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Detalle cuenta</h6>
                  {cuentaSeleccionada && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setCuentaSeleccionada(null);
                        setVentaSeleccionada(null);
                      }}
                    >
                      <i className="bi bi-x"/>Quitar
                    </button>
                  )}
                </div>
                <div className="card-body py-2">
                  {!cuentaSeleccionada ? (
                    <div className="text-muted text-center py-4">
                      <i className="bi bi-arrow-right-circle fs-1 opacity-50 mb-2 d-block"/>
                      Selecciona una cuenta
                    </div>
                  ) : (
                    <>
                      {/* Resumen cuenta */}
                      <div className="mb-3 p-2  rounded">
                        <div className="fw-bold fs-6 mb-1">{cuentaSeleccionada.nombre}</div>
                        <div className="text-primary fw-bold fs-5">  {/* ✅ Azul */}
                          {formatMoney(cuentaSeleccionada.saldo)}
                        </div>
                        <small className="text-muted">
                          Vendido: {formatMoney(cuentaSeleccionada.totalFacturado)} | 
                          Pagado: {formatMoney(cuentaSeleccionada.totalPagado)}
                        </small>
                      </div>

                      {/* Ventas a crédito */}
                      <h6 className="fw-bold mb-2">
                        📋 Ventas a crédito ({ventasDeCuenta.length})
                      </h6>
                      <div className="border rounded mb-3" style={{ maxHeight: 200, overflow: 'auto' }}>
                        <DataTable
                          columns={columnasVentas}
                          data={ventasDeCuenta}
                          initialSort={{ id: 'fecha', direction: 'desc' }}
                          maxHeight={200}
                          onRowClick={(v) => setVentaSeleccionada(ventaSeleccionada?.ventaId === v.ventaId ? null : v)}
                          getRowKey={(v) => v.ventaId || v.id}  // ✅ FIX
                          selectedRowKey={ventaSeleccionada?.ventaId}
                        />
                      </div>

                      {/* ✅ Productos + IMPRIMIR TICKET */}
                      {ventaSeleccionada && (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0">
                              🛒 Venta #{ventaSeleccionada.ventaId || ventaSeleccionada.id}
                            </h6>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={handleImprimirTicket}  // ✅ BOTÓN IMPRIMIR
                                title="Imprimir ticket"
                              >
                                <i className="bi bi-printer"/> Ticket
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setVentaSeleccionada(null)}
                              >
                                <i className="bi bi-x"/>Cerrar
                              </button>
                            </div>
                          </div>
                          <div className="border rounded" style={{ maxHeight: 220, overflow: 'auto' }}>
                            {loadingProductos ? (
                              <div className="p-3 text-center">
                                <div className="spinner-border spinner-border-sm me-2"/>
                                Cargando productos...
                              </div>
                            ) : productosVenta.length > 0 ? (
                              <DataTable
                                columns={columnasProductos}
                                data={productosVenta}
                                maxHeight={220}
                                striped
                                small
                              />
                            ) : (
                              <div className="p-3 text-center text-muted small">
                                Sin productos
                              </div>
                            )}
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
