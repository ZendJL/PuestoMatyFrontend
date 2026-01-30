export default function ResumenMerma({ 
  totalItems = 0, 
  costoEstimado = 0, 
  formatMoney, 
  tipoMerma = 'CADUCADO', 
  labelTipo 
}) {
  const tipoLabel = labelTipo 
    ? labelTipo(tipoMerma) 
    : (tipoMerma === 'CADUCADO' ? 'Caducado' : 
       tipoMerma === 'USO_PERSONAL' ? 'Uso personal' : 
       tipoMerma === 'MAL_ESTADO' ? 'Mal estado' : 
       tipoMerma === 'ROBO' ? 'Robo' : 'Otro');

  return (
    <div className="card border-start border-danger border-3 shadow-sm h-100">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-file-earmark-text me-2 text-danger"/>Resumen
          </h6>
        </div>
        
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <span className="text-body-secondary small">Items</span>
            <span className="fw-bold fs-5">{totalItems}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-body-secondary small">Tipo</span>
            <span className="fw-bold badge bg-danger-subtle text-danger px-2 py-1">
              {tipoLabel}
            </span>
          </div>
        </div>

        <div className="p-3 rounded bg-danger-subtle mt-3">
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-bold text-danger fs-5">Costo estimado</span>
            <span className="fs-2 fw-bold text-danger">{formatMoney?.(costoEstimado) || '$0.00'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
