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

const ETIQUETA_PAGO = {
  PESOS: '🇲🇽 Efectivo',
  TARJETA: '💳 Tarjeta',
  DOLARES: '🇺🇸 Dólares',
  MIXTO: '🔀 Mixto',
};

const BADGE_PAGO = {
  PESOS: 'bg-success-subtle text-success-emphasis border border-success-subtle',
  TARJETA: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
  DOLARES: 'bg-info-subtle text-info-emphasis border border-info-subtle',
  MIXTO: 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle',
};

export default function ConsultaVentas() {
  const { desde: hoyDesde, hasta: hoyHasta } = hoyRango();

  const [desde, setDesde] = useState(formatoFechaInput(hoyDesde));
  const [hasta, setHasta] = useState(formatoFechaInput(hoyHasta));
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const { data: ventasRaw, isLoading, error } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas');
      return res.data;
    },
  });

  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

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

  if (isLoading) return <div className="text-center py-5 fs-5">Cargando ventas...</div>;
  if (error) return <div className="text-danger text-center py-5">Error al cargar ventas</div>;

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="bg-success text-white px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0" style={{ minHeight: 54 }}>
        <div>
          <h5 className="mb-0 fw-bold">🧾 Consulta de Ventas</h5>
          <small className="opacity-75">{ventasFiltradas.length} venta(s) en el rango · máx. 10</small>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div className="d-flex gap-2 align-items-end">
            <div>
              <label className="form-label mb-1 text-white-50" style={{ fontSize: '0.75rem' }}>Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label mb-1 text-white-50" style={{ fontSize: '0.75rem' }}>Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-light btn-sm fw-semibold"
              onClick={() => {
                const h = hoyRango();
                setDesde(formatoFechaInput(h.desde));
                setHasta(formatoFechaInput(h.hasta));
              }}
            >
              Hoy
            </button>
          </div>
        </div>
      </div>

      {/* ── CUERPO 2 COLUMNAS ────────────────────────────────── */}
      <div className="flex-fill d-flex overflow-hidden">

        {/* COLUMNA IZQUIERDA: lista de ventas */}
        <div
          className="d-flex flex-column border-end"
          style={{ width: ventaSeleccionada ? '52%' : '100%', minWidth: 320, transition: 'width 0.2s' }}
        >
          <div className="bg-body-tertiary border-bottom px-3 py-2 flex-shrink-0">
            <span className="small text-muted">Haz clic en una venta para ver el detalle</span>
          </div>
          <div className="overflow-auto flex-fill">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: 50 }}>ID</th>
                  <th style={{ width: 150 }}>Fecha</th>
                  <th style={{ width: 130 }}>Cuenta</th>
                  <th style={{ width: 130 }}>Tipo pago</th>
                  <th className="text-end" style={{ width: 100 }}>Total</th>
                  <th className="text-center" style={{ width: 100 }}>Status</th>
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
                    <td className="fw-semibold">{v.id}</td>
                    <td className="small">{v.fecha?.replace('T', ' ').substring(0, 19)}</td>
                    <td className="small">
                      {v.status === 'PRESTAMO'
                        ? v.cuenta?.nombre
                          ? v.cuenta.nombre
                          : v.cuentaId
                          ? `Cuenta ${v.cuentaId}`
                          : 'Préstamo'
                        : '—'}
                    </td>
                    <td className="small">
                      {v.tipoPago ? (
                        <span className={`badge ${BADGE_PAGO[v.tipoPago] ?? 'bg-secondary-subtle text-secondary-emphasis'}`}>
                          {ETIQUETA_PAGO[v.tipoPago] ?? v.tipoPago}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-end fw-semibold text-success">${v.total?.toFixed(2)}</td>
                    <td className="text-center">
                      <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {ventasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5">
                      <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50" />
                      No hay ventas en el rango seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMNA DERECHA: detalle de venta */}
        {ventaSeleccionada && (
          <div className="d-flex flex-column flex-fill overflow-hidden bg-body">

            {/* Header detalle */}
            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-body-tertiary flex-shrink-0">
              <div>
                <h5 className="mb-0 fw-bold">🧾 Venta #{ventaSeleccionada.id}</h5>
                <div className="small text-muted d-flex flex-wrap gap-3 mt-1">
                  <span><strong>Fecha:</strong> {ventaSeleccionada.fecha?.replace('T', ' ').substring(0, 19)}</span>
                  <span><strong>Total:</strong> <span className="fw-semibold text-success">${ventaSeleccionada.total?.toFixed(2)}</span></span>
                  {ventaSeleccionada.tipoPago && (
                    <span>
                      <strong>Pago:</strong>{' '}
                      <span className={`badge ${BADGE_PAGO[ventaSeleccionada.tipoPago] ?? 'bg-secondary-subtle text-secondary-emphasis'}`}>
                        {ETIQUETA_PAGO[ventaSeleccionada.tipoPago] ?? ventaSeleccionada.tipoPago}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <button className="btn btn-outline-secondary" onClick={() => setVentaSeleccionada(null)}>
                <i className="bi bi-x-lg" /> Cerrar
              </button>
            </div>

            <div className="overflow-auto flex-fill">
              {loadingDetalle && (
                <div className="text-center py-4"><span className="spinner-border" /></div>
              )}
              {errorDetalle && (
                <div className="text-danger text-center py-4">Error al cargar productos de la venta.</div>
              )}
              {!loadingDetalle && !errorDetalle && (
                <table className="table table-sm table-striped mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Producto</th>
                      <th className="text-center" style={{ width: 70 }}>Cant.</th>
                      <th className="text-end" style={{ width: 100 }}>Precio</th>
                      <th className="text-end" style={{ width: 100 }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((vp) => {
                      const precio = vp.precioUnitario ?? vp.producto?.precio ?? 0;
                      const subtotal = precio * vp.cantidad;
                      return (
                        <tr key={vp.id}>
                          <td className="text-truncate" style={{ maxWidth: 220 }}>
                            {vp.producto?.descripcion || 'Producto'}
                            <div className="small text-muted">Código: {vp.producto?.codigo}</div>
                          </td>
                          <td className="text-center fw-bold">{vp.cantidad}</td>
                          <td className="text-end">${precio.toFixed(2)}</td>
                          <td className="text-end fw-semibold text-success">${subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {detalle.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-5">
                          <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50" />
                          Esta venta no tiene productos asociados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
