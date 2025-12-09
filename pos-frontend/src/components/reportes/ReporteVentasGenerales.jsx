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
    const day = hoy.getDay(); // 0=domingo
    const diff = hoy.getDate() - day + (day === 0 ? -6 : 1); // lunes
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

export default function ReporteVentasGenerales() {
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const { desde: dIni, hasta: dFin } = getInicioFinPeriodo('dia');
  const [desde, setDesde] = useState(formatoFechaInput(dIni));
  const [hasta, setHasta] = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // Traer todas las ventas (incluyendo productos si tu API ya los expone)
  const { data: ventasRaw, isLoading, error } = useQuery({
    queryKey: ['ventas-reporte-generales'],
    queryFn: async () => {
      const res = await axios.get('http://localhost:8080/api/ventas');
      return res.data;
    },
  });

  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

  const ventasFiltradas = useMemo(() => {
    if (!ventas.length) return [];

    const dDesde = new Date(desde + 'T00:00:00');
    const dHasta = new Date(hasta + 'T23:59:59');

    let lista = ventas
      .filter((v) => {
        if (!v.fecha) return false;
        const f = new Date(v.fecha);
        return f >= dDesde && f <= dHasta;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const texto = busqueda.toLowerCase();
    if (texto) {
      lista = lista.filter((v) => {
        const idStr = String(v.id ?? '');
        const cuentaNombre = v.cuenta?.nombre ?? '';
        const desc = v.descripcion ?? '';
        return (
          idStr.includes(texto) ||
          cuentaNombre.toLowerCase().includes(texto) ||
          desc.toLowerCase().includes(texto)
        );
      });
    }

    return lista;
  }, [ventas, desde, hasta, busqueda]);

  const totalVentas = ventasFiltradas.length;
  const totalImporte = ventasFiltradas.reduce(
    (sum, v) => sum + (v.total || 0),
    0
  );
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
  };

  if (isLoading) return <div>Cargando ventas...</div>;
  if (error) return <div className="text-danger">Error al cargar ventas</div>;

  return (
    <div>
      <h5 className="mb-3">Historial de ventas generales</h5>

      {/* Filtros */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label mb-1">Período</label>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn btn-outline-primary ${
                tipoPeriodo === 'dia' ? 'active' : ''
              }`}
              onClick={() => aplicarPeriodo('dia')}
            >
              Día
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
          <label className="form-label mb-1">Buscar venta</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="ID, nombre de cuenta, descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="col small text-muted">
          {totalVentas} ventas · Total:{' '}
          <span className="fw-semibold text-success">
            ${totalImporte.toFixed(2)}
          </span>{' '}
          · Préstamos:{' '}
          <span className="fw-semibold text-warning">
            ${totalPrestamos.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="row">
        {/* Tabla de ventas */}
        <div className="col-md-7">
          <div className="border rounded" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th style={{ width: 150 }}>Fecha</th>
                  <th style={{ width: 140 }}>Cuenta</th>
                  <th className="text-end" style={{ width: 100 }}>
                    Total
                  </th>
                  <th className="text-center" style={{ width: 90 }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => handleClickVenta(v)}
                    style={{ cursor: 'pointer' }}
                    className={ventaSeleccionada?.id === v.id ? 'table-active' : ''}
                  >
                    <td>{v.id}</td>
                    <td className="small">
                      {v.fecha?.replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="small">
                      {v.status === 'PRESTAMO'
                        ? v.cuenta?.nombre
                          ? v.cuenta.nombre
                          : v.cuentaId
                          ? `Cuenta ${v.cuentaId}`
                          : 'Préstamo'
                        : 'Contado'}
                    </td>
                    <td className="text-end fw-semibold">
                      ${v.total?.toFixed(2)}
                    </td>
                    <td className="text-center">
                                            <span
                        className={
                          v.status === 'PRESTAMO'
                            ? 'badge bg-warning text-dark'
                            : 'badge bg-success-subtle text-success-emphasis border border-success-subtle'
                        }
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {ventasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No hay ventas en el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle de productos de la venta seleccionada */}
        <div className="col-md-5">
          <h6>Detalle de venta</h6>

          {!ventaSeleccionada && (
            <div className="text-muted small">
              Selecciona una venta para ver sus productos.
            </div>
          )}

          {ventaSeleccionada && (
            <>
              <div className="small mb-2">
                <div>
                  <strong>Folio:</strong> {ventaSeleccionada.id}
                </div>
                <div>
                  <strong>Fecha:</strong>{' '}
                  {ventaSeleccionada.fecha?.replace('T', ' ').substring(0, 19)}
                </div>
                <div>
                  <strong>Tipo:</strong>{' '}
                  {ventaSeleccionada.status === 'PRESTAMO' ? 'Préstamo' : 'Contado'}
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
                      <th className="text-end" style={{ width: 90 }}>
                        P. unit.
                      </th>
                      <th className="text-end" style={{ width: 100 }}>
                        Importe
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaSeleccionada.ventaProductos?.map((vp) => (
                      <tr key={vp.id}>
                        <td className="small">
                          {vp.producto?.descripcion || `Producto ${vp.producto?.id}`}
                          <div className="text-muted">
                            Código: {vp.producto?.codigo}
                          </div>
                        </td>
                        <td className="text-center">{vp.cantidad}</td>
                        <td className="text-end">
                          ${Number(vp.precioUnitario ?? vp.precio ?? 0).toFixed(2)}
                        </td>
                        <td className="text-end fw-semibold">
                          $
                          {(
                            (vp.cantidad || 0) *
                            (vp.precioUnitario ?? vp.precio ?? 0)
                          ).toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {(!ventaSeleccionada.ventaProductos ||
                      ventaSeleccionada.ventaProductos.length === 0) && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          Esta venta no tiene productos asociados.
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
