import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatFecha } from '../../utils/format';
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

const TIPOS_MERMA = ['CADUCADO', 'MAL_ESTADO', 'USO_PERSONAL', 'ROBO', 'OTRO'];

export default function ReporteMermas() {
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const { desde: dIni, hasta: dFin } = getInicioFinPeriodo('dia');
  const [desde, setDesde] = useState(formatoFechaInput(dIni));
  const [hasta, setHasta] = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda] = useState('');
  const [tiposSeleccionados, setTiposSeleccionados] = useState(TIPOS_MERMA);
  const [mermaSeleccionada, setMermaSeleccionada] = useState(null);

  const { data: mermasData, isLoading, error } = useQuery({
    queryKey: ['reporte-mermas'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:8080/api/mermas');
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

    if (tiposSeleccionados.length > 0) {
      lista = lista.filter((m) => tiposSeleccionados.includes(m.tipoMerma));
    }

    const texto = busqueda.toLowerCase();
    if (texto) {
      lista = lista.filter((m) =>
        (m.descripcion || '').toLowerCase().includes(texto)
      );
    }

    return lista;
  }, [mermas, desde, hasta, tiposSeleccionados, busqueda]);

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  const totalMermas = mermasFiltradas.length;

  const toggleTipo = (tipo) => {
    setMermaSeleccionada(null);
    setTiposSeleccionados((prev) => {
      if (prev.includes(tipo)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== tipo);
      }
      return [...prev, tipo];
    });
  };

  const seleccionarTodosTipos = () => {
    setTiposSeleccionados(TIPOS_MERMA);
    setMermaSeleccionada(null);
  };

  const estaTodosSeleccionados =
    tiposSeleccionados.length === TIPOS_MERMA.length;

  const labelTipo = (t) =>
    t === 'CADUCADO'
      ? 'Caducado'
      : t === 'MAL_ESTADO'
      ? 'Mal estado'
      : t === 'USO_PERSONAL'
      ? 'Uso personal'
      : t === 'ROBO'
      ? 'Robo'
      : 'Otro';

  if (isLoading) return <div className="fs-6">Cargando mermas...</div>;
  if (error)
    return <div className="text-danger fs-6">Error al cargar mermas</div>;

  const columnasMermas = [
    {
      id: 'fecha',
      header: 'Fecha',
      style: { width: 170 },
      accessor: (m) => m.fecha,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'AAAA-MM-DD',
      render: (m) => {
        const d = new Date(m.fecha);
        if (Number.isNaN(d.getTime())) return m.fecha;
        const fechaStr = d.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const horaStr = d.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return (
          <>
            <div>{fechaStr}</div>
            <div className="text-body-secondary small">{horaStr}</div>
          </>
        );
      },
      sortFn: (a, b) => new Date(a) - new Date(b),
      defaultSortDirection: 'desc',
    },
    {
      id: 'tipoMerma',
      header: 'Tipo',
      style: { width: 140 },
      accessor: (m) => m.tipoMerma,
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Tipo',
      render: (m) => labelTipo(m.tipoMerma),
    },
    {
      id: 'descripcion',
      header: 'Descripción',
      accessor: (m) => m.descripcion || '',
      filterable: true,
      filterPlaceholder: 'Descripción',
      cellClassName: 'text-truncate small text-body-primary',
    },
  ];

  const totalCostoMermaSeleccionada =
    mermaSeleccionada?.mermaProductos?.reduce(
      (acc, mp) => acc + (mp.costoTotal || 0),
      0
    ) || 0;

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
            <h5 className="mb-0">Historial de mermas</h5>
            <small className="text-white-50">
              Registros de productos dados de baja por caducidad, mal estado,
              uso personal o robo.
            </small>
          </div>
          <div className="text-end">
            <div className="text-white-50">
              Mermas encontradas: <strong>{totalMermas}</strong>
            </div>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
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

              <div className="col-md-5">
                <label className="form-label mb-1">Tipo de merma</label>
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${
                      estaTodosSeleccionados
                        ? 'btn-primary'
                        : 'btn-outline-primary'
                    }`}
                    onClick={seleccionarTodosTipos}
                  >
                    Todos
                  </button>
                  {TIPOS_MERMA.map((t) => {
                    const activo = tiposSeleccionados.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`btn ${
                          activo ? 'btn-primary' : 'btn-outline-primary'
                        }`}
                        onClick={() => toggleTipo(t)}
                      >
                        {labelTipo(t)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col-md-3">
                <label className="form-label mb-1">Buscar descripción</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <div className="col text-body-primary small">
                {totalMermas} mermas en el período y tipos seleccionados.
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-7">
              <div className="card h-100">
                <div className="card-header py-2 bg-body-tertiary">
                  <h6 className="mb-0">Mermas registradas</h6>
                </div>
                <div className="card-body p-0 bg-body">
                  <DataTable
                    columns={columnasMermas}
                    data={mermasFiltradas}
                    initialSort={{ id: 'fecha', direction: 'desc' }}
                    maxHeight={320}
                    onRowClick={(m) => setMermaSeleccionada(m)}
                    getRowKey={(m) => m.id}
                    selectedRowKey={mermaSeleccionada?.id}
                  />
                </div>
              </div>
            </div>

            <div className="col-md-5">
              <div className="card h-100">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Detalle de merma</h6>
                  {mermaSeleccionada && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setMermaSeleccionada(null)}
                    >
                      Quitar selección
                    </button>
                  )}
                </div>
                <div className="card-body py-2 bg-body">
                  {!mermaSeleccionada && (
                    <div className="text-body-primary">
                      Selecciona una merma de la tabla para ver sus productos.
                    </div>
                  )}

                  {mermaSeleccionada && (
                    <>
                      <div className="mb-2 small text-body-primary">
                        <div>
                          <strong>Fecha:</strong>{' '}
                          {formatFecha(mermaSeleccionada.fecha)}
                        </div>
                        <div>
                          <strong>Tipo:</strong>{' '}
                          {labelTipo(mermaSeleccionada.tipoMerma)}
                        </div>
                        <div>
                          <strong>Descripción:</strong>{' '}
                          {mermaSeleccionada.descripcion}
                        </div>
                        <div>
                          <strong>Costo total merma:</strong>{' '}
                          ${totalCostoMermaSeleccionada.toFixed(2)}
                        </div>
                      </div>

                      <div
                        className="table-responsive border rounded bg-body"
                        style={{ maxHeight: 260, overflowY: 'auto' }}
                      >
                        <table className="table table-sm table-striped mb-0 align-middle fs-6">
                          <thead className="sticky-top">
                            <tr>
                              <th>Producto</th>
                              <th
                                className="text-center"
                                style={{ width: 80 }}
                              >
                                Cantidad
                              </th>
                              <th
                                className="text-end"
                                style={{ width: 90 }}
                              >
                                Costo unit.
                              </th>
                              <th
                                className="text-end"
                                style={{ width: 90 }}
                              >
                                Costo total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {mermaSeleccionada.mermaProductos?.map((mp) => (
                              <tr key={mp.id}>
                                <td className="small text-body-primary">
                                  {mp.producto?.descripcion ||
                                    `Producto ${mp.producto?.id}`}
                                  <div className="text-body-primary small">
                                    Código: {mp.producto?.codigo}
                                  </div>
                                </td>
                                <td className="text-center">
                                  {mp.cantidad}
                                </td>
                                <td className="text-end">
                                  {mp.costoTotal != null && mp.cantidad
                                    ? `$${(mp.costoTotal / mp.cantidad).toFixed(
                                        2
                                      )}`
                                    : '-'}
                                </td>
                                <td className="text-end">
                                  {mp.costoTotal != null
                                    ? `$${mp.costoTotal.toFixed(2)}`
                                    : '-'}
                                </td>
                              </tr>
                            ))}

                            {(!mermaSeleccionada.mermaProductos ||
                              mermaSeleccionada.mermaProductos.length ===
                                0) && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="text-center text-body-primary py-3"
                                >
                                  Esta merma no tiene productos asociados.
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
