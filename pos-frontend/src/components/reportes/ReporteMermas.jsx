import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatFecha } from '../../utils/format';

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

const TIPOS_MERMA = ['CADUCIDAD', 'MAL_ESTADO', 'USO_PERSONAL', 'ROBO'];

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
      if (!m.fechaSalida) return false;
      const f = new Date(m.fechaSalida);
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

    lista.sort((a, b) => new Date(b.fechaSalida) - new Date(a.fechaSalida));
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
    t === 'CADUCIDAD'
      ? 'Caducidad'
      : t === 'MAL_ESTADO'
      ? 'Mal estado'
      : t === 'USO_PERSONAL'
      ? 'Uso personal'
      : 'Robo';

  if (isLoading) return <div className="fs-6">Cargando mermas...</div>;
  if (error) return <div className="text-danger fs-6">Error al cargar mermas</div>;

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
            {/* Tabla de mermas */}
            <div className="col-md-7">
              <div className="card h-100">
                <div className="card-header py-2 bg-body-tertiary">
                  <h6 className="mb-0">Mermas registradas</h6>
                </div>
                <div className="card-body p-0 bg-body">
                  <div
                    className="table-responsive"
                    style={{ maxHeight: 320, overflowY: 'auto' }}
                  >
                    <table className="table table-hover table-striped mb-0 align-middle fs-6">
                      <thead className="sticky-top">
                        <tr>
                          <th style={{ width: 170 }}>Fecha</th>
                          <th style={{ width: 140 }}>Tipo</th>
                          <th>Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mermasFiltradas.map((m) => (
                          <tr
                            key={m.id}
                            onClick={() => setMermaSeleccionada(m)}
                            style={{ cursor: 'pointer' }}
                            className={
                              mermaSeleccionada?.id === m.id
                                ? 'table-primary'
                                : ''
                            }
                          >
                            <td className="small text-body-primary">
                              {formatFecha(m.fechaSalida)}
                            </td>
                            <td className="small text-body-primary">
                              {labelTipo(m.tipoMerma)}
                            </td>
                            <td className="text-truncate small text-body-primary">
                              {m.descripcion}
                            </td>
                          </tr>
                        ))}

                        {mermasFiltradas.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="text-center text-body-primary py-3"
                            >
                              No hay mermas en el período seleccionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalle de merma */}
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
                          {formatFecha(mermaSeleccionada.fechaSalida)}
                        </div>
                        <div>
                          <strong>Tipo:</strong>{' '}
                          {labelTipo(mermaSeleccionada.tipoMerma)}
                        </div>
                        <div>
                          <strong>Descripción:</strong>{' '}
                          {mermaSeleccionada.descripcion}
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
                              </tr>
                            ))}

                            {(!mermaSeleccionada.mermaProductos ||
                              mermaSeleccionada.mermaProductos.length ===
                                0) && (
                              <tr>
                                <td
                                  colSpan={2}
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
