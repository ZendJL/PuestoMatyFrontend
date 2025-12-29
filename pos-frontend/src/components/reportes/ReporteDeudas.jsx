import { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import DataTable from '../common/DataTable';

export default function ReporteDeudas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const { data: cuentasRaw, isLoading, error } = useQuery({
    queryKey: ['cuentas-reporte-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas');
      return res.data;
    },
  });

  const {
    data: ventasRaw,
    isLoading: loadingVentas,
    error: errorVentas,
  } = useQuery({
    queryKey: ['ventas-reporte-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas');
      return res.data;
    },
  });

  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];
  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

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

  const ventasDeCuenta = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return ventas.filter((v) => {
      const idCuentaVenta = v.cuenta?.id ?? v.cuentaId;
      return idCuentaVenta === cuentaSeleccionada.id;
    });
  }, [ventas, cuentaSeleccionada]);

  const totalDeudores = cuentasConDeuda.length;
  const totalDeuda = cuentasConDeuda.reduce(
    (sum, c) => sum + (c.saldo || 0),
    0
  );

  if (isLoading || loadingVentas) {
    return <div className="fs-6">Cargando datos...</div>;
  }
  if (error || errorVentas) {
    return <div className="text-danger fs-6">Error al cargar datos</div>;
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
      render: (c) => <div className="fw-semibold">{c.nombre}</div>,
    },
    {
      id: 'saldo',
      header: 'Saldo pendiente',
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      style: { width: 130 },
      accessor: (c) => c.saldo || 0,
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (c) => (
        <span className="badge bg-danger-subtle text-danger fw-semibold">
          {formatMoney(c.saldo || 0)}
        </span>
      ),
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
    },
    {
      id: 'descripcion',
      header: 'Notas',
      accessor: (c) => c.descripcion || '',
      filterable: true,
      filterPlaceholder: 'Notas',
      cellClassName: 'text-truncate text-body-primary small',
      cellStyle: { maxWidth: 220 },
    },
  ];

  const columnasVentas = [
    {
      id: 'id',
      header: 'Venta',
      style: { width: 70 },
      accessor: (v) => v.id,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'ID',
      cellClassName: 'text-body-primary small',
    },
    {
      id: 'fecha',
      header: 'Fecha',
      style: { width: 170 },
      accessor: (v) => v.fecha,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'AAAA-MM-DD',
      render: (v) => formatFecha(v.fecha),
      sortFn: (a, b) => new Date(a) - new Date(b),
      defaultSortDirection: 'desc',
    },
    {
      id: 'total',
      header: 'Total',
      style: { width: 120 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold',
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
      header: 'Estado',
      style: { width: 110 },
      accessor: (v) => v.status,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'PRESTAMO...',
      render: (v) =>
        v.status === 'PRESTAMO' ? (
          <span className="badge bg-warning text-dark">Préstamo</span>
        ) : (
          <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">
            {v.status}
          </span>
        ),
    },
  ];

  const columnasProductos = [
    {
      id: 'producto',
      header: 'Producto',
      accessor: (vp) => vp.producto?.descripcion || '',
      filterable: true,
      filterPlaceholder: 'Descripción',
      render: (vp) => (
        <>
          {vp.producto?.descripcion || `Producto ${vp.producto?.id}`}
          {vp.producto?.codigo && (
            <div className="text-body-primary small">
              Código: {vp.producto.codigo}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'cantidad',
      header: 'Cantidad',
      style: { width: 80 },
      headerAlign: 'center',
      cellClassName: 'text-center',
      accessor: (vp) => vp.cantidad || 0,
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
    },
    {
      id: 'precio',
      header: 'Precio',
      style: { width: 110 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      accessor: (vp) => vp.precioUnitario ?? vp.precio ?? 0,
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (vp) => formatMoney(vp.precioUnitario ?? vp.precio ?? 0),
    },
    {
      id: 'importe',
      header: 'Importe',
      style: { width: 120 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold',
      accessor: (vp) => {
        const precio = vp.precioUnitario ?? vp.precio ?? 0;
        const cantidad = vp.cantidad || 0;
        return precio * cantidad;
      },
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (vp) => {
        const precio = vp.precioUnitario ?? vp.precio ?? 0;
        const cantidad = vp.cantidad || 0;
        return formatMoney(precio * cantidad);
      },
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
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
            <h5 className="mb-0">Reporte de deudas</h5>
            <small className="text-white-50">
              Cuentas con saldo pendiente y sus ventas a crédito.
            </small>
          </div>
          <div className="text-end">
            <div className="text-white-50">
              Cuentas con deuda:{' '}
              <strong className="text-warning">{totalDeudores}</strong>
            </div>
            <div className="fw-semibold text-warning">
              Total adeudado: {formatMoney(totalDeuda)}
            </div>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          <div className="row g-3">
            {/* Columna izquierda: cuentas */}
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <div className="flex-grow-1 me-2">
                  <label className="form-label mb-1">Buscar cliente</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Nombre o descripción de la cuenta..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="text-body-primary small">
                  {totalDeudores} cuentas listadas
                </div>
              </div>

              <div className="border rounded small bg-body">
                <DataTable
                  columns={columnasCuentas}
                  data={cuentasConDeuda}
                  initialSort={{ id: 'saldo', direction: 'desc' }}
                  maxHeight={320}
                  onRowClick={(c) => {
                    setCuentaSeleccionada(c);
                    setVentaSeleccionada(null);
                  }}
                  getRowKey={(c) => c.id}
                  selectedRowKey={cuentaSeleccionada?.id}
                />
              </div>
            </div>

            {/* Columna derecha: detalle */}
            <div className="col-md-6">
              <div className="card h-100 fs-6">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Detalle de la cuenta</h6>
                  {cuentaSeleccionada && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setCuentaSeleccionada(null);
                        setVentaSeleccionada(null);
                      }}
                    >
                      Quitar selección
                    </button>
                  )}
                </div>
                <div className="card-body py-2 bg-body">
                  {!cuentaSeleccionada && (
                    <div className="text-body-primary">
                      Haz clic en una cuenta de la tabla izquierda para ver sus
                      ventas a crédito y productos.
                    </div>
                  )}

                  {cuentaSeleccionada && (
                    <>
                      <div className="mb-2">
                        <div className="fw-semibold">
                          {cuentaSeleccionada.nombre} (ID{' '}
                          {cuentaSeleccionada.id})
                        </div>
                        <div>
                          Saldo pendiente:{' '}
                          <span className="text-danger fw-bold">
                            {formatMoney(cuentaSeleccionada.saldo || 0)}
                          </span>
                        </div>
                        {cuentaSeleccionada.descripcion && (
                          <div className="text-body-primary small">
                            Notas: {cuentaSeleccionada.descripcion}
                          </div>
                        )}
                      </div>

                      <h6 className="fw-bold mb-1">Ventas a crédito</h6>
                      <div className="border rounded small bg-body mb-2">
                        <DataTable
                          columns={columnasVentas}
                          data={ventasDeCuenta}
                          initialSort={{
                            id: 'fecha',
                            direction: 'desc',
                          }}
                          maxHeight={200}
                          onRowClick={(v) => setVentaSeleccionada(v)}
                          getRowKey={(v) => v.id}
                          selectedRowKey={ventaSeleccionada?.id}
                        />
                      </div>

                      {ventaSeleccionada && (
                        <div className="mt-2">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <h6 className="fw-bold mb-0">
                              Productos de la venta #{ventaSeleccionada.id}
                            </h6>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setVentaSeleccionada(null)}
                            >
                              Quitar venta
                            </button>
                          </div>

                          <div className="border rounded small bg-body">
                            <DataTable
                              columns={columnasProductos}
                              data={
                                ventaSeleccionada.ventaProductos || []
                              }
                              maxHeight={200}
                              striped
                              small
                            />
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
