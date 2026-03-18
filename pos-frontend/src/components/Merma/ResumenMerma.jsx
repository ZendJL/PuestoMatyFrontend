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

  const tarjetas = [
    {
      icon: 'bi-box-seam',
      color: 'text-primary',
      bg: 'bg-primary bg-opacity-10',
      label: 'Productos distintos',
      valor: totalItems > 0 ? `${totalItems}` : '—',
      small: 'unidades totales'
    },
    {
      icon: 'bi-tag-fill',
      color: 'text-warning',
      bg: 'bg-warning bg-opacity-10',
      label: 'Tipo de merma',
      valor: tipoLabel,
      badge: tipoBadgeClass,
      esBadge: true,
    },
  ];

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
          {tarjetas.map((t, i) => (
            <div key={i} className="col-6">
              <div className={`p-3 rounded ${t.bg} h-100`}>
                <i className={`bi ${t.icon} fs-4 ${t.color} d-block mb-1`} />
                <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{t.label}</div>
                {t.esBadge ? (
                  <span className={`badge mt-1 ${t.badge}`} style={{ fontSize: '0.75rem' }}>
                    {t.valor}
                  </span>
                ) : (
                  <div className={`fw-bold fs-5 ${t.color}`}>{t.valor}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Costo estimado grande */}
        <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="small fw-semibold text-danger">
              <i className="bi bi-currency-dollar me-1" />Costo estimado FIFO
            </span>
            {costoCargando && <div className="spinner-border spinner-border-sm text-danger" />}
          </div>
          <div className="fw-bold text-danger" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
            {formatMoney?.(costoEstimado) || '$0.00'}
          </div>
          <small className="text-muted" style={{ fontSize: '0.7rem' }}>
            Calculado en tiempo real con método FIFO
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
