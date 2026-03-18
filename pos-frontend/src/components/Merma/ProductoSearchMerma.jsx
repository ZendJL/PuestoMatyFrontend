export default function ProductoSearchMerma({
  busqueda = '',
  setBusqueda,
  productosFiltrados = [],
  agregarItemMerma,
  inputBusquedaRef,
  tipoMerma = 'CADUCADO',
  setTipoMerma,
  descripcionMerma = '',
  setDescripcionMerma,
  formatMoney,
  codigoEscaneado = ''
}) {
  const modoEscaneo = (codigoEscaneado || '').length > 0;

  const TIPOS = [
    { id: 'CADUCADO',     label: 'Caducado',     icon: 'bi-clock-history',      badge: 'btn-warning' },
    { id: 'USO_PERSONAL', label: 'Uso Personal', icon: 'bi-person-fill',        badge: 'btn-info' },
    { id: 'MAL_ESTADO',   label: 'Mal Estado',   icon: 'bi-exclamation-circle', badge: 'btn-secondary' },
    { id: 'ROBO',         label: 'Robo',         icon: 'bi-shield-exclamation', badge: 'btn-dark' },
    { id: 'OTRO',         label: 'Otro',         icon: 'bi-three-dots',         badge: 'btn-primary' },
  ];

  const handleManualEnter = (e) => {
    if (e?.key === 'Enter' && !modoEscaneo &&
        Array.isArray(productosFiltrados) && productosFiltrados.length > 0) {
      e.preventDefault();
      agregarItemMerma?.(productosFiltrados[0]);
    }
  };

  return (
    <div className="card shadow-sm mb-3 border-0">
      <div className="card-header bg-body-tertiary border-bottom py-2">
        <h6 className="mb-0 fw-semibold">
          <i className={`bi me-2 ${
            modoEscaneo ? 'bi-upc-scan text-warning' : 'bi-plus-circle-fill text-danger'
          }`} />
          {modoEscaneo ? 'Escáner activo' : 'Agregar producto'}
          {modoEscaneo && (
            <span className="badge bg-warning text-dark ms-2">
              <span className="spinner-border spinner-border-sm me-1"
                style={{ width: '0.7rem', height: '0.7rem' }} />
              {(codigoEscaneado || '').length} dígitos
            </span>
          )}
        </h6>
      </div>

      <div className="card-body p-3">
        {/* ── TIPO DE MERMA ── */}
        <div className="mb-3">
          <label className="form-label fw-semibold small text-muted mb-2">
            <i className="bi bi-tag me-1" />Tipo de merma
          </label>
          <div className="d-flex flex-wrap gap-1">
            {TIPOS.map(({ id, label, icon, badge }) => {
              const activo = tipoMerma === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`btn btn-sm ${
                    activo
                      ? badge + ' text-white shadow-sm'
                      : 'btn-outline-secondary'
                  }`}
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => !modoEscaneo && setTipoMerma?.(id)}
                  disabled={modoEscaneo || !setTipoMerma}
                >
                  <i className={`bi ${icon} me-1`} />
                  {label}
                  {activo && <i className="bi bi-check-lg ms-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── DESCRIPCIÓN ── */}
        <div className="mb-3">
          <label className="form-label fw-semibold small text-muted mb-1">
            <i className="bi bi-chat-left-text me-1" />Descripción <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Ej: Caducados del anaquel 3, revisión semanal..."
            value={descripcionMerma || ''}
            onChange={(e) => setDescripcionMerma?.(e.target.value || '')}
            disabled={modoEscaneo || !setDescripcionMerma}
          />
        </div>

        {/* ── BUSCADOR ── */}
        <div>
          <label className="form-label fw-semibold small text-muted mb-1">
            <i className={`bi me-1 ${ modoEscaneo ? 'bi-upc-scan' : 'bi-search' }`} />
            {modoEscaneo ? 'Escaneando código de barras' : 'Buscar producto'}
          </label>
          <input
            ref={inputBusquedaRef}
            className={`form-control form-control-lg ${
              modoEscaneo ? 'border-warning border-2 bg-warning bg-opacity-10' : ''
            }`}
            placeholder={
              modoEscaneo
                ? '⚡ Escaneando...'
                : 'Escribe nombre o código... (Enter para agregar primero)'
            }
            value={modoEscaneo ? `Código: ${codigoEscaneado || ''}` : (busqueda || '')}
            onChange={(e) => setBusqueda?.(e.target.value || '')}
            onKeyDown={handleManualEnter}
            disabled={modoEscaneo || !setBusqueda}
            autoFocus
          />

          {/* Resultados de búsqueda */}
          {!modoEscaneo && busqueda && Array.isArray(productosFiltrados) && productosFiltrados.length > 0 && (
            <div className="border rounded-bottom shadow-sm" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {productosFiltrados.map((p, idx) => (
                <div
                  key={p?.id || idx}
                  className={`d-flex align-items-center justify-content-between px-3 py-2 ${
                    idx === 0 ? 'bg-danger bg-opacity-10 border-bottom' : 'border-bottom'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => agregarItemMerma?.(p)}
                >
                  <div>
                    <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                      {idx === 0 && <span className="badge bg-danger me-2" style={{ fontSize: '0.65rem' }}>Enter</span>}
                      {p?.descripcion || 'Sin nombre'}
                    </div>
                    <small className="text-muted">#{p?.codigo || 'N/A'}</small>
                  </div>
                  <div className="text-end">
                    <div className="small fw-bold">{formatMoney?.(p?.precioVenta || 0)}</div>
                    <span className={`badge ${ (p?.cantidad || 0) > 10 ? 'bg-success' : (p?.cantidad || 0) > 0 ? 'bg-warning text-dark' : 'bg-danger' }`}>
                      Stock: {p?.cantidad || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Escáner activo */}
          {modoEscaneo && (
            <div className="alert alert-warning p-3 mt-2 mb-0 d-flex align-items-center gap-3">
              <div className="spinner-border text-warning flex-shrink-0" />
              <div>
                <strong className="d-block">Leyendo código de barras</strong>
                <div className="font-monospace fs-3 fw-bold text-dark mt-1">{codigoEscaneado}</div>
                <small className="text-muted">{(codigoEscaneado || '').length} de ~13 dígitos</small>
              </div>
            </div>
          )}

          {/* Ayuda */}
          {!modoEscaneo && !busqueda && (
            <div className="small text-muted text-center mt-2 py-1">
              <i className="bi bi-info-circle me-1" />
              Escribe para buscar manualmente o activa el escáner de código de barras
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
