import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';
import DataTable from '../common/DataTable';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10);
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

export default function ReporteVentasPorProducto() {
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const { desde: dIni, hasta: dFin } = getInicioFinPeriodo('dia');
  const [desde, setDesde] = useState(formatoFechaInput(dIni));
  const [hasta, setHasta] = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const { data: resumenRaw, isLoading, error } = useQuery({
    queryKey: ['ventas-productos-reporte', { desde, hasta }],
    queryFn: async () => {
      const res = await axios.get(
        '/api/ventas-productos/reportes/ventas-por-producto',
        {
          params: { desde, hasta },
        }
      );
      return res.data;
    },
  });

  const datosAgrupados = useMemo(() => {
    const arr = Array.isArray(resumenRaw) ? resumenRaw : [];
    const texto = busqueda.toLowerCase();
    if (!texto) return arr;

    return arr.filter(
      (p) =>
        p.descripcion?.toLowerCase().includes(texto) ||
        p.codigo?.toLowerCase().includes(texto)
    );
  }, [resumenRaw, busqueda]);

  const totalProductos = datosAgrupados.length;
  const totalUnidades = datosAgrupados.reduce(
    (sum, p) => sum + (p.totalCantidad || 0),
    0
  );
  const totalImporte = datosAgrupados.reduce(
    (sum, p) => sum + Number(p.totalVentas || 0),
    0
  );
  const totalGanancia = datosAgrupados.reduce((sum, p) => {
    const totalVentas = Number(p.totalVentas || 0);
    const totalCosto = Number(p.totalCosto || 0);
    const ganancia = totalVentas - totalCosto;
    return sum + ganancia;
  }, 0);

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  if (isLoading) {
    return <div className="fs-6">Cargando ventas por producto...</div>;
  }
  if (error) {
    return <div className="text-danger fs-6">Error al cargar ventas</div>;
  }

  const columnas = [
    {
      id: 'productoId',
      header: 'ID',
      style: { width: 70 },
      accessor: (p) => p.productoId,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'ID',
      cellClassName: 'small text-body-primary',
    },
    {
      id: 'descripcion',
      header: 'Producto',
      accessor: (p) => p.descripcion || '',
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Descripción',
      render: (p) => (
        <>
          <div
            className="fw-semibold text-truncate"
            style={{ maxWidth: 260 }}
          >
            {p.descripcion}
          </div>
          <div className="text-body-primary small">
            Código: {p.codigo}
          </div>
        </>
      ),
    },
    {
      id: 'totalCantidad',
      header: 'Unidades vendidas',
      style: { width: 120 },
      headerAlign: 'center',
      cellClassName: 'text-center fw-semibold',
      accessor: (p) => p.totalCantidad,
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
    },
    {
      id: 'precioVenta',
      header: 'Precio venta',
      style: { width: 120 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      accessor: (p) => {
        if (!p.totalCantidad || p.totalCantidad === 0) return 0;
        return Number(p.totalVentas || 0) / p.totalCantidad;
      },
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (p) => {
        const totalVentas = Number(p.totalVentas || 0);
        const precioPromedio = p.totalCantidad ? totalVentas / p.totalCantidad : 0;
        return formatMoney(precioPromedio);
      },
      sortFn: (a, b) => (a || 0) - (b || 0),
    },
    {
      id: 'totalVentas',
      header: 'Importe total',
      style: { width: 140 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold text-success',
      accessor: (p) => Number(p.totalVentas || 0),
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (p) => formatMoney(Number(p.totalVentas || 0)),
      sortFn: (a, b) => (a || 0) - (b || 0),
      defaultSortDirection: 'desc',
    },
    {
      id: 'totalGanancia',
      header: 'Ganancia total',
      style: { width: 140 },
      headerAlign: 'right',
      headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold text-primary',
      accessor: (p) => {
        const totalVentas = Number(p.totalVentas || 0);
        const totalCosto = Number(p.totalCosto || 0);
        return totalVentas - totalCosto;
      },
      sortable: true,
      filterable: true,
      filterPlaceholder: '>= 0',
      render: (p) => {
        const totalVentas = Number(p.totalVentas || 0);
        const totalCosto = Number(p.totalCosto || 0);
        const ganancia = totalVentas - totalCosto;
        return formatMoney(ganancia);
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
            <h5 className="mb-0">Ventas por producto</h5>
            <small className="text-white-50">
              Analiza qué productos se venden más y cuál es su ganancia en el
              período.
            </small>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">
                  Productos vendidos
                </div>
                <div className="fs-5 fw-bold">{totalProductos}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">
                  Unidades totales
                </div>
                <div className="fs-5 fw-bold">{totalUnidades}</div>
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
                <div className="small text-body-primary">Ganancia total</div>
                <div className="fs-5 fw-bold text-primary">
                  {formatMoney(totalGanancia)}
                </div>
              </div>
            </div>
          </div>

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
                <label className="form-label mb-1">Buscar producto</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Código o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="col small text-body-primary">
                {totalProductos} productos distintos en el rango seleccionado.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
              <h6 className="mb-0">Detalle por producto</h6>
              <small className="text-body-primary">
                Clic en los encabezados para ordenar. Filtros en la fila
                inferior.
              </small>
            </div>
            <div className="card-body p-0 bg-body">
              <DataTable
                columns={columnas}
                data={datosAgrupados}
                initialSort={{ id: 'totalGanancia', direction: 'desc' }}
                maxHeight={360}
                getRowKey={(p) => p.productoId}
                onRowClick={(p) => setProductoSeleccionado(p)}
                selectedRowKey={productoSeleccionado?.productoId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
