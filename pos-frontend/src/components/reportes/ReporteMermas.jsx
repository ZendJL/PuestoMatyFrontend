import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10); // YYYY-MM-DD
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

export default function ReporteMermas() {
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const { desde: dIni, hasta: dFin } = getInicioFinPeriodo('dia');
  const [desde, setDesde] = useState(formatoFechaInput(dIni));
  const [hasta, setHasta] = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
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

    if (filtroTipo !== 'TODOS') {
      lista = lista.filter((m) => m.tipoMerma === filtroTipo);
    }

    const texto = busqueda.toLowerCase();
    if (texto) {
      lista = lista.filter((m) =>
        (m.descripcion || '').toLowerCase().includes(texto)
      );
    }

    lista.sort((a, b) => new Date(b.fechaSalida) - new Date(a.fechaSalida));
    return lista;
  }, [mermas, desde, hasta, filtroTipo, busqueda]);

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  const totalMermas = mermasFiltradas.length;

  if (isLoading) return <div>Cargando mermas...</div>;
  if (error) return <div className="text-danger">Error al cargar mermas</div>;

  return (
    <div>
      <h5 className="mb-3">Historial de mermas</h5>

      {/* Filtros al estilo ventas */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label mb-1">Período</label>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn btn-outline-primary ${tipoPeriodo === 'dia' ? 'active' : ''}`}
              onClick={() => aplicarPeriodo('dia')}
            >
              Día
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

                  <div className="col-auto">
          <label className="form-label mb-1">Tipo de merma</label>
          <div className="d-flex flex-wrap gap-2">
            {['TODOS', 'CADUCIDAD', 'MAL_ESTADO', 'USO_PERSONAL', 'ROBO'].map(
              (t) => (
                <div className="form-check form-check-inline" key={t}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="filtroTipoMerma"
                    id={`filtro-${t}`}
                    value={t}
                    checked={filtroTipo === t}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                  />
                  <label
                    className="form-check-label small"
                    htmlFor={`filtro-${t}`}
                  >
                    {t === 'TODOS'
                      ? 'Todos'
                      : t === 'CADUCIDAD'
                      ? 'Caducidad'
                      : t === 'MAL_ESTADO'
                      ? 'Mal estado'
                      : t === 'USO_PERSONAL'
                      ? 'Uso personal'
                      : 'Robo'}
                  </label>
                </div>
              )
            )}
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

        <div className="col small text-muted">
          {totalMermas} mermas encontradas
        </div>
      </div>

      <div className="row">
        {/* Tabla de mermas (izquierda, estilo ventas) */}
        <div className="col-md-7">
          <div className="border rounded" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
                            <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: 160 }}>Fecha</th>
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
                    className={mermaSeleccionada?.id === m.id ? 'table-active' : ''}
                  >
                    <td>{m.fechaSalida?.replace('T', ' ').substring(0, 16)}</td>
                    <td>{m.tipoMerma}</td>
                    <td className="text-truncate">{m.descripcion}</td>
                  </tr>
                ))}

                {mermasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-3">
                      No hay mermas en el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle de productos (derecha) */}
        <div className="col-md-5">
          <h6>Detalle de merma</h6>

          {!mermaSeleccionada && (
            <div className="text-muted small">
              Selecciona una merma para ver sus productos.
            </div>
          )}

          {mermaSeleccionada && (
            <>
              <div className="small mb-2">
                <div>
                  <strong>Fecha:</strong>{' '}
                  {mermaSeleccionada.fechaSalida?.replace('T', ' ').substring(0, 16)}
                </div>
                <div>
                  <strong>Tipo:</strong> {mermaSeleccionada.tipoMerma}
                </div>
                <div>
                  <strong>Descripción:</strong> {mermaSeleccionada.descripcion}
                </div>
              </div>

              <div className="border rounded" style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table className="table table-sm mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Producto</th>
                      <th className="text-center" style={{ width: 80 }}>
                        Cant.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mermaSeleccionada.mermaProductos?.map((mp) => (
                      <tr key={mp.id}>
                        <td className="small">
                          {mp.producto?.descripcion || `Producto ${mp.producto?.id}`}
                          <div className="text-muted">
                            Código: {mp.producto?.codigo}
                          </div>
                        </td>
                        <td className="text-center">{mp.cantidad}</td>
                      </tr>
                    ))}

                    {(!mermaSeleccionada.mermaProductos ||
                      mermaSeleccionada.mermaProductos.length === 0) && (
                      <tr>
                        <td colSpan={2} className="text-center text-muted py-3">
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
  );
}

