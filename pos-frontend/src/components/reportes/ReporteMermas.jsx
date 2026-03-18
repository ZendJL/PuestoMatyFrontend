import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';
import DataTable from '../common/DataTable';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10);
}

function getInicioFinPeriodo(tipo) {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (tipo === 'dia')   return { desde: inicioDia, hasta: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59) };
  if (tipo === 'semana') {
    const day = hoy.getDay();
    const diff = hoy.getDate() - day + (day === 0 ? -6 : 1);
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), diff);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return { desde: inicioSemana, hasta: finSemana };
  }
  if (tipo === 'mes') return {
    desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59),
  };
  return { desde: inicioDia, hasta: hoy };
}

const TIPOS_MERMA = ['CADUCADO', 'MAL_ESTADO', 'USO_PERSONAL', 'ROBO', 'OTRO'];

const BADGE_TIPO = {
  CADUCADO:    'bg-warning text-dark',
  MAL_ESTADO:  'bg-secondary text-white',
  USO_PERSONAL:'bg-info text-dark',
  ROBO:        'bg-danger text-white',
  OTRO:        'bg-dark text-white',
};

const labelTipo = (t) => ({
  CADUCADO: 'Caducado', MAL_ESTADO: 'Mal estado',
  USO_PERSONAL: 'Uso personal', ROBO: 'Robo', OTRO: 'Otro',
})[t] ?? t;

export default function ReporteMermas() {
  const [tipoPeriodo, setTipoPeriodo]   = useState('dia');
  const { desde: dIni }                 = getInicioFinPeriodo('dia');
  const [desde, setDesde]               = useState(formatoFechaInput(dIni));
  const [hasta, setHasta]               = useState(formatoFechaInput(new Date()));
  const [busqueda, setBusqueda]         = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState(TIPOS_MERMA);
  const [mermaSeleccionada, setMermaSeleccionada]   = useState(null);

  const { data: mermasData, isLoading, error } = useQuery({
    queryKey: ['reporte-mermas'],
    queryFn: async () => {
      const res = await axios.get('/api/mermas');
      return res.data;
    },
  });

  const mermas = Array.isArray(mermasData) ? mermasData : [];

  const mermasFiltradas = useMemo(() => {
    const dDesde = new Date(desde + 'T00:00:00');
    const dHasta = new Date(hasta + 'T23:59:59');
    let lista = mermas.filter((m) => {
      if (!m.fecha) return false;
      const f = new Date(m.fecha);
      return f >= dDesde && f <= dHasta;
    });
    if (tiposSeleccionados.length > 0) lista = lista.filter((m) => tiposSeleccionados.includes(m.tipoMerma));
    const texto = busqueda.toLowerCase();
    if (texto) lista = lista.filter((m) => (m.descripcion || '').toLowerCase().includes(texto));
    return lista;
  }, [mermas, desde, hasta, tiposSeleccionados, busqueda]);

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  const toggleTipo = (tipo) => {
    setMermaSeleccionada(null);
    setTiposSeleccionados((prev) => {
      if (prev.includes(tipo)) { if (prev.length === 1) return prev; return prev.filter((t) => t !== tipo); }
      return [...prev, tipo];
    });
  };

  const totalMermas = mermasFiltradas.length;
  const totalCostoMermaSeleccionada = mermaSeleccionada?.mermaProductos?.reduce((acc, mp) => acc + (mp.costoTotal || 0), 0) || 0;
  const totalCostoGeneral = mermasFiltradas.reduce((sum, m) => sum + (m.mermaProductos?.reduce((a, mp) => a + (mp.costoTotal || 0), 0) || 0), 0);

  if (isLoading) return <div className="text-center py-5 fs-5"><div className="spinner-border text-danger me-2" /><span>Cargando mermas...</span></div>;
  if (error)     return <div className="alert alert-danger m-3"><i className="bi bi-exclamation-triangle-fill me-2" />Error al cargar mermas</div>;

  const columnasMermas = [
    {
      id: 'fecha', header: 'Fecha', style: { width: 150 },
      accessor: (m) => m.fecha, sortable: true, filterable: true, filterPlaceholder: 'AAAA-MM-DD',
      render: (m) => {
        const d = new Date(m.fecha);
        if (Number.isNaN(d.getTime())) return m.fecha;
        return (
          <>
            <div>{d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
            <div className="text-body-secondary small">{d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
          </>
        );
      },
      sortFn: (a, b) => new Date(a) - new Date(b), defaultSortDirection: 'desc',
    },
    {
      id: 'tipoMerma', header: 'Tipo', style: { width: 130 },
      accessor: (m) => m.tipoMerma, sortable: true, filterable: true, filterPlaceholder: 'Tipo',
      render: (m) => <span className={`badge ${BADGE_TIPO[m.tipoMerma] ?? 'bg-secondary'}`}>{labelTipo(m.tipoMerma)}</span>,
    },
    {
      id: 'descripcion', header: 'Descripción',
      accessor: (m) => m.descripcion || '', filterable: true, filterPlaceholder: 'Descripción',
      cellClassName: 'text-truncate small text-body-primary',
    },
  ];

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 80px)', marginBottom: '1rem' }}>

        {/* HEADER */}
        <div className="card-header py-3 d-flex justify-content-between align-items-center bg-danger text-white">
          <div>
            <h5 className="mb-0 fw-bold"><i className="bi bi-trash3-fill me-2" />Historial de Mermas</h5>
            <small className="text-white-50">Productos dados de baja por caducidad, mal estado, uso personal o robo.</small>
          </div>
          <div className="text-end">
            <div className="small text-white-50">Mermas encontradas</div>
            <div className="fs-4 fw-bold">{totalMermas}</div>
          </div>
        </div>

        <div className="card-body py-3">

          {/* TARJETAS RESUMEN */}
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <div className="card border-danger border-2">
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-trash3-fill text-danger fs-5" />
                    <small className="text-muted fw-semibold">Mermas en período</small>
                  </div>
                  <div className="fs-4 fw-bold text-danger">{totalMermas}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-warning border-2">
                <div className="card-body py-2 px-3">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-cash-stack text-warning fs-5" />
                    <small className="text-muted fw-semibold">Costo total</small>
                  </div>
                  <div className="fs-4 fw-bold text-warning">{formatMoney(totalCostoGeneral)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="card border mb-3">
            <div className="card-header py-2 bg-body-tertiary">
              <h6 className="mb-0"><i className="bi bi-funnel me-2" />Filtros</h6>
            </div>
            <div className="card-body py-3">
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-3">
                  <label className="form-label fw-semibold mb-2">Período rápido</label>
                  <div className="btn-group w-100" role="group">
                    {['dia', 'semana', 'mes', 'rango'].map((t) => (
                      <button key={t} type="button"
                        className={`btn btn-outline-danger ${tipoPeriodo === t ? 'active' : ''}`}
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
                <div className="col-12 col-md-5">
                  <label className="form-label fw-semibold mb-2">Tipo de merma</label>
                  <div className="d-flex flex-wrap gap-2">
                    <button type="button"
                      className={`btn btn-sm ${tiposSeleccionados.length === TIPOS_MERMA.length ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => setTiposSeleccionados(TIPOS_MERMA)}
                    >
                      Todos
                    </button>
                    {TIPOS_MERMA.map((t) => (
                      <button key={t} type="button"
                        className={`btn btn-sm ${tiposSeleccionados.includes(t) ? `btn-danger` : 'btn-outline-secondary'}`}
                        onClick={() => toggleTipo(t)}
                      >
                        {labelTipo(t)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="row g-3 mt-1">
                <div className="col-12 col-md-5">
                  <label className="form-label fw-semibold mb-2">Buscar por descripción</label>
                  <input type="text" className="form-control form-control-lg" placeholder="Descripción de la merma..."
                    value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                </div>
                <div className="col d-flex align-items-end">
                  <span className="text-muted"><i className="bi bi-filter me-1" />{totalMermas} mermas en el período y tipos seleccionados</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLA + DETALLE */}
          <div className="row g-3">
            <div className="col-12 col-md-7">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0"><i className="bi bi-list-ul me-2" />Mermas registradas</h6>
                  <span className="badge bg-danger rounded-pill fs-6">{totalMermas}</span>
                </div>
                <div className="card-body p-0">
                  <DataTable
                    columns={columnasMermas}
                    data={mermasFiltradas}
                    initialSort={{ id: 'fecha', direction: 'desc' }}
                    maxHeight={300}
                    onRowClick={(m) => setMermaSeleccionada(m)}
                    getRowKey={(m) => m.id}
                    selectedRowKey={mermaSeleccionada?.id}
                  />
                </div>
                <div className="card-footer py-2 text-muted small">
                  <i className="bi bi-hand-index me-1" />Haz clic en una merma para ver sus productos
                </div>
              </div>
            </div>

            <div className="col-12 col-md-5">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0"><i className="bi bi-info-circle me-2" />Detalle de merma</h6>
                  {mermaSeleccionada && (
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setMermaSeleccionada(null)}>
                      <i className="bi bi-x me-1" />Quitar selección
                    </button>
                  )}
                </div>
                <div className="card-body p-3">
                  {!mermaSeleccionada ? (
                    <div className="text-muted text-center py-5">
                      <i className="bi bi-arrow-left-circle fs-1 opacity-50 mb-3 d-block" />
                      <div className="fs-6 fw-semibold">Selecciona una merma</div>
                      <small>Haz clic en cualquier fila para ver los productos afectados</small>
                    </div>
                  ) : (
                    <>
                      {/* Info merma */}
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Fecha</div>
                            <div className="fw-semibold">{formatFecha(mermaSeleccionada.fecha)}</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-2 rounded bg-body-secondary">
                            <div className="small text-muted">Tipo</div>
                            <span className={`badge ${BADGE_TIPO[mermaSeleccionada.tipoMerma] ?? 'bg-secondary'} fs-6`}>
                              {labelTipo(mermaSeleccionada.tipoMerma)}
                            </span>
                          </div>
                        </div>
                        {mermaSeleccionada.descripcion && (
                          <div className="col-12">
                            <div className="p-2 rounded bg-body-secondary">
                              <div className="small text-muted">Descripción</div>
                              <div className="fw-semibold">{mermaSeleccionada.descripcion}</div>
                            </div>
                          </div>
                        )}
                        <div className="col-12">
                          <div className="p-2 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
                            <div className="small text-muted">Costo total de esta merma</div>
                            <div className="fw-bold text-danger fs-5">{formatMoney(totalCostoMermaSeleccionada)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Productos afectados */}
                      <h6 className="fw-bold mb-2"><i className="bi bi-boxes me-2" />Productos afectados ({mermaSeleccionada.mermaProductos?.length ?? 0})</h6>
                      <div className="border rounded" style={{ maxHeight: 260, overflowY: 'auto' }}>
                        <table className="table table-sm table-striped table-hover mb-0 align-middle">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Producto</th>
                              <th className="text-center" style={{ width: 70 }}>Cantidad</th>
                              <th className="text-end" style={{ width: 90 }}>Costo/U</th>
                              <th className="text-end" style={{ width: 90 }}>Costo total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mermaSeleccionada.mermaProductos?.map((mp) => (
                              <tr key={mp.id}>
                                <td className="small">
                                  <div className="fw-semibold">{mp.producto?.descripcion || `Producto ${mp.producto?.id}`}</div>
                                  <small className="text-muted">Código: {mp.producto?.codigo}</small>
                                </td>
                                <td className="text-center fw-bold">{mp.cantidad}</td>
                                <td className="text-end small">
                                  {mp.costoTotal != null && mp.cantidad ? formatMoney(mp.costoTotal / mp.cantidad) : '—'}
                                </td>
                                <td className="text-end fw-bold text-danger">
                                  {mp.costoTotal != null ? formatMoney(mp.costoTotal) : '—'}
                                </td>
                              </tr>
                            ))}
                            {(!mermaSeleccionada.mermaProductos || mermaSeleccionada.mermaProductos.length === 0) && (
                              <tr><td colSpan={4} className="text-center text-muted py-3">Sin productos asociados</td></tr>
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
