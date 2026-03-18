export default function ModoPago({ modoPrestamo, setModoPrestamo }) {
  return (
    <div className="card flex-shrink-0">
      <div className="card-body p-2">
        <div className="row g-2">
          <div className="col-6">
            <div
              className={`rounded p-2 text-center h-100 ${
                !modoPrestamo
                  ? 'bg-primary-subtle border border-primary shadow-sm'
                  : 'bg-body-tertiary'
              }`}
              style={{ cursor: 'pointer' }}
              onClick={() => setModoPrestamo(false)}
            >
              <div className={`mb-1 ${!modoPrestamo ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '1.6rem' }}>
                <i className="bi bi-cash-stack" />
              </div>
              <div className={`fw-bold ${!modoPrestamo ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '0.95rem' }}>
                Contado
              </div>
            </div>
          </div>
          <div className="col-6">
            <div
              className={`rounded p-2 text-center h-100 ${
                modoPrestamo
                  ? 'bg-warning-subtle border border-warning shadow-sm'
                  : 'bg-body-tertiary'
              }`}
              style={{ cursor: 'pointer' }}
              onClick={() => setModoPrestamo(true)}
            >
              <div className={`mb-1 ${modoPrestamo ? 'text-warning' : 'text-muted'}`} style={{ fontSize: '1.6rem' }}>
                <i className="bi bi-person-check" />
              </div>
              <div className={`fw-bold ${modoPrestamo ? 'text-warning' : 'text-muted'}`} style={{ fontSize: '0.95rem' }}>
                Fiado
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
