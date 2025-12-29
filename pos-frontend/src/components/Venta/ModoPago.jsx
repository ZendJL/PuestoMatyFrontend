export default function ModoPago({ modoPrestamo, setModoPrestamo }) {
  return (
    <div 
      className="card mb-3 p-3 hover-shadow" 
      style={{ cursor: 'pointer', minHeight: '130px', transition: 'all 0.2s' }}
      onClick={() => setModoPrestamo(!modoPrestamo)}
      title="Click para cambiar modo de pago"
    >
      <div className="row g-3 h-100">
        <div className={`col-6 ${!modoPrestamo ? 'border-end' : ''}`}>
          <div className={`h-100 p-3 rounded hover-scale ${
            !modoPrestamo 
              ? 'bg-primary-subtle border border-primary-subtle shadow-sm' 
              : 'bg-body-tertiary'
          }`}>
            <div className={`fs-2 mb-2 ${
              !modoPrestamo ? 'text-primary' : 'text-body-secondary'
            }`}>
              <i className="bi bi-cash-stack"/>
            </div>
            <div className={`fw-bold h6 mb-1 ${
              !modoPrestamo ? 'text-primary' : 'text-body-secondary'
            }`}>
              Contado
            </div>
            <small className={!modoPrestamo ? 'text-primary' : 'text-body-secondary'}>
              Pago inmediato
            </small>
          </div>
        </div>
        <div className="col-6">
          <div className={`h-100 p-3 rounded hover-scale ${
            modoPrestamo 
              ? 'bg-warning-subtle border border-warning-subtle shadow-sm' 
              : 'bg-body-tertiary'
          }`}>
            <div className={`fs-2 mb-2 ${
              modoPrestamo ? 'text-warning' : 'text-body-secondary'
            }`}>
              <i className="bi bi-person-check"/>
            </div>
            <div className={`fw-bold h6 mb-1 ${
              modoPrestamo ? 'text-warning' : 'text-body-secondary'
            }`}>
              Préstamo
            </div>
            <small className={modoPrestamo ? 'text-warning' : 'text-body-secondary'}>
              Por pagar después
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
