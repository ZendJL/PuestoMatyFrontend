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
    return { desde: inicioDia, hasta: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59) };
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
    return {
      desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
      hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  return { desde: inicioDia, hasta: hoy };
}

export default function ReporteVentasPorProducto() {
  const [tipoPeriodo, setTipoPeriodo]             = useState('dia');
  const { desde: dIni, hasta: dFin }              = getInicioFinPeriodo('dia');
  const [desde, setDesde]                         = useState(formatoFechaInput(dIni));
  const [hasta, setHasta]                         = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda]                   = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const { data: resumenRaw, isLoading, error } = useQuery({
    queryKey: ['ventas-productos-reporte', { desde, hasta }],
    queryFn: async () => {
      const res = await axios.get('/api/ventas-productos/reportes/ventas-por-producto', { params: { desde, hasta } });
      return res.data;
    },
  });

  const datosAgrupados = useMemo(() => {
    const arr = Array.isArray(resumenRaw) ? resumenRaw : [];
    const texto = busqueda.toLowerCase();
    if (!texto) return arr;
    return arr.filter((p) =>
      p.descripcion?.toLowerCase().includes(texto) || p.codigo?.toLowerCase().includes(texto)
    );
  }, [resumenRaw, busqueda]);

  const totalProductos = datosAgrupados.length;
  const totalUnidades  = datosAgrupados.reduce((sum, p) => sum + (p.totalCantidad || 0), 0);
  const totalImporte   = datosAgrupados.reduce((sum, p) => sum + Number(p.totalVentas || 0), 0);
  const totalGanancia  = datosAgrupados.reduce((sum, p) => sum + (Number(p.totalVentas || 0) - Number(p.totalCosto || 0)), 0);

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  if (isLoading) return <div className="text-center py-5 fs-5"><div className="spinner-border text-primary me-2" /><span>Cargando...</span></div>;
  if (error)     return <div className="alert alert-danger m-3"><i className="bi bi-exclamation-triangle-fill me-2" />Error al cargar ventas</div>;

  const columnas = [
    {
      id: 'productoId', header: 'ID', style: { width: 70 },
      accessor: (p) => p.productoId, sortable: true, filterable: true,
      filterPlaceholder: 'ID', cellClassName: 'small text-body-primary',
    },
    {
      id: 'descripcion', header: 'Producto',
      accessor: (p) => p.descripcion || '', sortable: true, filterable: true,
      filterPlaceholder: 'Descripción',
      render: (p) => (
        <>
          <div className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>{p.descripcion}</div>
          <div className="text-body-primary small">Código: {p.codigo}</div>
        </>
      ),
    },
    {
      id: 'totalCantidad', header: 'Unidades', style: { width: 100 },
      headerAlign: 'center', cellClassName: 'text-center fw-semibold',
      accessor: (p) => p.totalCantidad, sortable: true, filterable: true,
      filterPlaceholder: '>= 0', sortFn: (a, b) => (a || 0) - (b || 0), defaultSortDirection: 'desc',
    },
    {
      id: 'precioVenta', header: 'Precio prom.', style: { width: 115 },
      headerAlign: 'right', headerClassName: 'text-end', cellClassName: 'text-end',
      accessor: (p) => p.totalCantidad ? Number(p.totalVentas || 0) / p.totalCantidad : 0,
      sortable: true, filterable: true, filterPlaceholder: '>= 0',
      render: (p) => formatMoney(p.totalCantidad ? Number(p.totalVentas || 0) / p.totalCantidad : 0),
      sortFn: (a, b) => (a || 0) - (b || 0),
    },
    {
      id: 'totalVentas', header: 'Importe', style: { width: 120 },
      headerAlign: 'right', headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold text-success',
      accessor: (p) => Number(p.totalVentas || 0), sortable: true, filterable: true,
      filterPlaceholder: '>= 0', render: (p) => formatMoney(Number(p.totalVentas || 0)),
      sortFn: (a, b) => (a || 0) - (b || 0), defaultSortDirection: 'desc',
    },
    {
      id: 'totalGanancia', header: 'Ganancia', style: { width: 120 },
      headerAlign: 'right', headerClassName: 'text-end',
      cellClassName: 'text-end fw-semibold text-primary',
      accessor: (p) => Number(p.totalVentas || 0) - Number(p.totalCosto || 0),
      sortable: true, filterable: true, filterPlaceholder: '>= 0',
      render: (p) => formatMoney(Number(p.totalVentas || 0) - Number(p.totalCosto || 0)),
      sortFn: (a, b) => (a || 0) - (b || 0), defaultSortDirection: 'desc',
    },
  ];

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 80px)', marginBottom: '1rem' }}>

        {/* HEADER */}
        <div className="card-header py-3 d-flex justify-content-between align-items-center bg-success text-white">
          <div>
            <h5 className="mb-0 fw-bold"><i className="bi bi-box-seam-fill me-2" />Ventas por Producto</h5>
            <small className="text-white-50">Analiza qué productos se venden más y su ganancia en el período.</small>
          </div>
          <div className="text-end">
            <div className="small text-white-50">Importe total</div>
            <div className="fs-4 fw-bold">{formatMoney(totalImporte)}</div>
          </div>
        </div>

        <div className="card-body py-3">

          {/* TARJETAS RESUMEN */}
          <div className="row g-3 mb-3">
            {[
              { label: 'Productos distintos', value: totalProductos, color: 'success',  icon: 'bi-box-seam',       fmt: v => v },
              { label: 'Unidades vendidas',   value: totalUnidades,  color: 'primary',  icon: 'bi-stack',          fmt: v => v },
              { label: 'Importe total',        value: totalImporte,  color: 'success',  icon: 'bi-cash-stack',     fmt: formatMoney },
              { label: 'Ganancia total',       value: totalGanancia, color: 'info',     icon: 'bi-graph-up-arrow', fmt: formatMoney },
            ].map((card, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className={`card border-${card.color} border-2 h-100`}>
                  <div className="card-body py-2 px-3">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className={`bi ${card.icon} text-${card.color} fs-5`} />
                      <small className="text-muted fw-semibold">{card.label}</small>
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
                        className={`btn btn-outline-success ${tipoPeriodo === t ? 'active' : ''}`}
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
                  <label className="form-label fw-semibold mb-2">Buscar producto</label>
                  <input type="text" className="form-control form-control-lg" placeholder="Código o descripción..."
                    value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* TABLA */}
          <div className="card">
            <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
              <h6 className="mb-0"><i className="bi bi-table me-2" />Detalle por producto</h6>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-success rounded-pill fs-6">{totalProductos} productos</span>
                <small className="text-muted">Clic en encabezados para ordenar</small>
              </div>
            </div>
            <div className="card-body p-0">
              <DataTable
                columns={columnas}
                data={datosAgrupados}
                initialSort={{ id: 'totalGanancia', direction: 'desc' }}
                maxHeight={340}
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
