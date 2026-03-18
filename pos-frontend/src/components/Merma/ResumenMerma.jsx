export default function ResumenMerma({
  totalItems = 0,
  costoEstimado = 0,
  costoCargando = false,
  formatMoney,
  tipoMerma = 'CADUCADO',
  labelTipo,
  badgeTipo,
}) {
  const tipoLabel = labelTipo
    ? labelTipo(tipoMerma)
    : (tipoMerma === 'CADUCADO' ? 'Caducado' :
       tipoMerma === 'USO_PERSONAL' ? 'Uso Personal' :
       tipoMerma === 'MAL_ESTADO' ? 'Mal Estado' :
       tipoMerma === 'ROBO' ? 'Robo' : 'Otro');

  const tipoBadgeClass = badgeTipo ? badgeTipo(tipoMerma) : 'bg-danger';

  return (
    <div className="card shadow-sm border-0">
      <div className="card-header bg-danger text-white py-2">
        <h6 className="mb-0 fw-semibold">
          <i className="bi bi-clipboard2-data-fill me-2" />
          Resumen de merma
        </h6>
      </div>
      <div className="card-body p-3">

        {/* Tarjetas de datos */}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <div className="p-3 rounded bg-primary bg-opacity-10 h-100">
              <i className="bi bi-box-seam fs-4 text-primary d-block mb-1" />
              <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Unidades totales</div>
              <div className="fw-bold fs-5 text-primary">{totalItems > 0 ? totalItems : '\u2014'}</div>
            </div>
          </div>
          <div className="col-6">
            <div className="p-3 rounded bg-warning bg-opacity-10 h-100">
              <i className="bi bi-tag-fill fs-4 text-warning d-block mb-1" />
              <div className="small text-muted" style={{ fontSize: '0.7rem' }}>Tipo</div>
              <span className={`badge mt-1 ${tipoBadgeClass}`} style={{ fontSize: '0.75rem' }}>
                {tipoLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Costo estimado */}
        <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small fw-semibold text-danger">
              <i className="bi bi-currency-dollar me-1" />Costo estimado
            </span>
            {costoCargando && <div className="spinner-border spinner-border-sm text-danger" />}
          </div>
          <div className="fw-bold text-danger" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
            {costoCargando ? '...' : (formatMoney?.(costoEstimado) || '$0.00')}
          </div>
          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
            Calculado en tiempo real
          </small>
        </div>

        {totalItems === 0 && (
          <div className="text-center text-muted mt-3 small">
            <i className="bi bi-arrow-left-circle me-1" />
            Agrega productos para ver el resumen
          </div>
        )}
      </div>
    </div>
  );
}
