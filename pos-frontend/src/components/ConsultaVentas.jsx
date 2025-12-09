import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10);
}

function hoyRango() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  return { desde, hasta };
}

export default function ConsultaVentas() {
  const { desde: hoyDesde, hasta: hoyHasta } = hoyRango();

  const [desde, setDesde] = useState(formatoFechaInput(hoyDesde));
  const [hasta, setHasta] = useState(formatoFechaInput(hoyHasta));
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // Todas las ventas
  const { data: ventasRaw, isLoading, error } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas');
      return res.data;
    },
  });

  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

  // Filtrar y ordenar
  const ventasFiltradas = useMemo(() => {
    if (!ventas.length) return [];
    const dDesde = new Date(desde + 'T00:00:00');
    const dHasta = new Date(hasta + 'T23:59:59');

    return ventas
      .filter((v) => {
        if (!v.fecha) return false;
        const f = new Date(v.fecha);
        return f >= dDesde && f <= dHasta;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 10);
  }, [ventas, desde, hasta]);

  // Detalle de la venta seleccionada (productos)
  const { data: detalleRaw, isLoading: loadingDetalle, error: errorDetalle } = useQuery({
    queryKey: ['detalle-venta', ventaSeleccionada?.id],
    queryFn: () =>
      ventaSeleccionada
        ? axios
            .get(`/api/ventas-productos/venta/${ventaSeleccionada.id}`)
            .then((res) => res.data)
        : Promise.resolve([]),
    enabled: !!ventaSeleccionada,
  });

  const detalle = Array.isArray(detalleRaw) ? detalleRaw : [];

  if (isLoading) return <div>Cargando ventas...</div>;
  if (error) return <div className="text-danger">Error al cargar ventas</div>;

  return (
    <div className="row g-3">
      {/* Columna izquierda: lista de ventas */}
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-header py-2 d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Ventas</h5>
            <span className="small text-muted">
              {desde} a {hasta}
            </span>
          </div>

          <div className="card-body py-3">
            {/* Filtros */}
            <div className="row g-2 align-items-end mb-3">
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
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    const h = hoyRango();
                    setDesde(formatoFechaInput(h.desde));
                    setHasta(formatoFechaInput(h.hasta));
                  }}
                >
                  Hoy
                </button>
              </div>
              <div className="col small text-muted">
                Máximo 10 ventas; haz clic en una para ver el detalle.
              </div>
            </div>

            {/* Tabla scrolleable */}
            <div className="border rounded" style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light sticky-top">
  <tr>
    <th style={{ width: 50 }}>ID</th>
    <th style={{ width: 140 }}>Fecha</th>
    <th style={{ width: 120 }}>Cuenta</th>
    <th className="text-end" style={{ width: 90 }}>
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
      style={{ cursor: 'pointer' }}
      className={ventaSeleccionada?.id === v.id ? 'table-primary' : ''}
      onClick={() => setVentaSeleccionada(v)}
    >
      <td>{v.id}</td>
      <td className="small">
        {v.fecha?.replace('T', ' ').substring(0, 19)}
      </td>
      <td className="small">
        {v.status === 'PRESTAMO'
          ? v.cuenta?.nombre
            ? `${v.cuenta.nombre}`
            : v.cuentaId
            ? `Cuenta ${v.cuentaId}`
            : 'Préstamo'
          : '—'}
      </td>
      <td className="text-end fw-semibold">
        ${v.total?.toFixed(2)}
      </td>
      <td className="text-center">
        <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">
          {v.status}
        </span>
      </td>
    </tr>
  ))}
  {ventasFiltradas.length === 0 && (
    <tr>
      <td colSpan={5} className="text-center text-muted py-3">
        No hay ventas en el rango seleccionado.
      </td>
    </tr>
  )}
</tbody>

              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Columna derecha: detalle de la venta */}
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-header py-2">
            <h5 className="mb-0">
              Detalle de venta{' '}
              {ventaSeleccionada ? `#${ventaSeleccionada.id}` : ''}
            </h5>
          </div>
          <div className="card-body py-3">
            {!ventaSeleccionada && (
              <div className="text-muted small">
                Selecciona una venta de la lista para ver sus productos.
              </div>
            )}

            {ventaSeleccionada && (
              <>
                <div className="mb-2 small text-muted">
                  Fecha:{' '}
                  {ventaSeleccionada.fecha
                    ?.replace('T', ' ')
                    .substring(0, 19)}{' '}
                  · Total:{' '}
                  <span className="fw-semibold text-success">
                    ${ventaSeleccionada.total?.toFixed(2)}
                  </span>
                </div>

                {loadingDetalle && (
                  <div className="text-muted small">Cargando detalle...</div>
                )}
                {errorDetalle && (
                  <div className="text-danger small">
                    Error al cargar productos de la venta.
                  </div>
                )}

                {!loadingDetalle && !errorDetalle && (
                  <div
                    className="border rounded small"
                    style={{ maxHeight: 260, overflowY: 'auto' }}
                  >
                    <table className="table table-sm table-striped mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Producto</th>
                          <th className="text-center" style={{ width: 70 }}>
                            Cant.
                          </th>
                          <th className="text-end" style={{ width: 90 }}>
                            Precio
                          </th>
                          <th className="text-end" style={{ width: 90 }}>
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalle.map((vp) => {
                          const precio =
                            vp.precioUnitario ??
                            vp.producto?.precio ??
                            0;
                          const subtotal = precio * vp.cantidad;

                          return (
                            <tr key={vp.id}>
                              <td className="text-truncate" style={{ maxWidth: 220 }}>
                                {vp.producto?.descripcion || 'Producto'}
                                <div className="small text-muted">
                                  Código: {vp.producto?.codigo}
                                </div>
                              </td>
                              <td className="text-center">
                                {vp.cantidad}
                              </td>
                              <td className="text-end">
                                ${precio.toFixed(2)}
                              </td>
                              <td className="text-end fw-semibold text-success">
                                ${subtotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                        {detalle.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-3">
                              Esta venta no tiene productos asociados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
