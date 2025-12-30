export default function ProductoSearchMerma({
  busqueda, 
  setBusqueda, 
  productosFiltrados, 
  agregarItemMerma, 
  inputBusquedaRef, // ⭐ YA LO RECIBES
  tipoMerma, 
  setTipoMerma,
  descripcionMerma, 
  setDescripcionMerma,
  formatMoney,
  codigoEscaneado
}) {
  const modoEscaneo = codigoEscaneado.length > 0;

  const handleManualEnter = (e) => {
    if (e.key === 'Enter' && !modoEscaneo && productosFiltrados.length > 0) {
      e.preventDefault();
      agregarItemMerma(productosFiltrados[0]);
    }
  };

  return (
    <div className="card border-start border-primary border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className={`bi bi-gear-fill me-2 ${modoEscaneo ? 'text-warning' : 'text-primary'}`}/>
            {modoEscaneo ? '🔢 ESCÁNER ACTIVO' : 'Agregar Merma'}
            {modoEscaneo && (
              <span className="badge bg-warning text-dark ms-2">
                <span className="spinner-border spinner-border-sm me-1" 
                      style={{ width: '0.8rem', height: '0.8rem' }}/>
                {codigoEscaneado.length} dígitos
              </span>
            )}
          </h6>
        </div>

        {/* Tipo Merma */}
        <div className="mb-3">
          <label className="form-label fw-semibold mb-2 small">Tipo de merma</label>
          <div className="btn-group w-100" role="group">
            {['CADUCADO', 'USO_PERSONAL', 'MAL_ESTADO', 'ROBO', 'OTRO'].map((t) => {
              const activo = tipoMerma === t;
              return (
                <button
                  key={t}
                  type="button"
                  className={`btn btn-sm ${activo ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setTipoMerma(t)}
                  disabled={modoEscaneo}
                >
                  {t === 'CADUCADO' ? 'Caducado' :
                   t === 'USO_PERSONAL' ? 'Uso personal' :
                   t === 'MAL_ESTADO' ? 'Mal estado' :
                   t === 'ROBO' ? 'Robo' : 'Otro'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-3">
          <label className="form-label fw-semibold mb-2 small">Descripción</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Ej: Productos caducados anaquel 3..."
            value={descripcionMerma}
            onChange={(e) => setDescripcionMerma(e.target.value)}
            disabled={modoEscaneo}
          />
        </div>

        {/* Buscador */}
        <label className="form-label fw-semibold mb-2">
          {modoEscaneo ? '⚡ Escaneando' : '🔍 Buscar producto'}
        </label>
        <input
          ref={inputBusquedaRef} // ⭐ USAR EL REF
          className={`form-control form-control-lg ${
            modoEscaneo 
              ? 'border-warning border-3 bg-warning bg-opacity-10' 
              : ''
          }`}
          placeholder={
            modoEscaneo
              ? "⚡ Escaneando código..."
              : "Escanea código o escribe... (Enter)"
          }
          value={modoEscaneo ? `Código: ${codigoEscaneado}` : busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={handleManualEnter}
          disabled={modoEscaneo}
          autoFocus // ⭐ Mantener como respaldo
        />

        {/* Lista filtrada (solo modo manual) */}
        {!modoEscaneo && busqueda && productosFiltrados.length > 0 && (
          <div className="table-responsive mt-2" style={{ maxHeight: '150px' }}>
            <table className="table table-sm table-hover mb-0">
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => agregarItemMerma(p)}>
                    <td className="text-truncate" style={{ maxWidth: '200px' }}>
                      <div className="fw-semibold">{p.descripcion}</div>
                      <small className="text-body-secondary">#{p.codigo}</small>
                    </td>
                    <td className="text-end">
                      <small className="text-muted">Stock: {p.cantidad}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Indicador visual modo escáner */}
        {modoEscaneo && (
          <div className="alert alert-warning p-3 mt-2 mb-0 d-flex align-items-center">
            <div className="spinner-border text-warning me-3">
              <span className="visually-hidden">Escaneando...</span>
            </div>
            <div className="flex-grow-1">
              <strong className="d-block">Escaneando código de barras</strong>
              <div className="font-monospace fs-4 text-dark mt-2 fw-bold">
                {codigoEscaneado}
              </div>
              <small className="text-muted">
                {codigoEscaneado.length} de ~13 dígitos
              </small>
            </div>
          </div>
        )}

        {/* AYUDA */}
        {!modoEscaneo && !busqueda && (
          <div className="small text-muted text-center mt-2">
            <i className="bi bi-info-circle me-1"/>
            Escribe para buscar manualmente o escanea código de barras
          </div>
        )}
      </div>
    </div>
  );
}
