import { useState } from 'react';

export default function ProductoSearch({
  busquedaInput,
  setBusquedaInput,
  busqueda,
  productosFiltrados,
  manejarSeleccionProducto,
  formatMoney,
  codigoEscaneado,
  inputRef, // ⭐ RECIBIR REF
}) {
  const [mensajeError, setMensajeError] = useState('');
  
  const modoEscaneo = codigoEscaneado.length > 0;

  const handleManualInput = (e) => {
    setBusquedaInput(e.target.value);
    setMensajeError('');
  };

  const handleManualEnter = (e) => {
    if (e.key === 'Enter' && !modoEscaneo && productosFiltrados.length > 0) {
      e.preventDefault();
      manejarSeleccionProducto(productosFiltrados[0]);
      setBusquedaInput('');
      setMensajeError('');
    }
  };

  return (
    <div className="card border-start border-success border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className={`bi bi-search me-2 ${
              modoEscaneo ? 'text-warning' : 'text-success'
            }`}/>
            {modoEscaneo ? '🔢 ESCÁNER ACTIVO' : '🔤 Buscar Producto'}
            {modoEscaneo && (
              <span className="badge bg-warning text-dark ms-2">
                <span className="spinner-border spinner-border-sm me-1" 
                      style={{ width: '0.8rem', height: '0.8rem' }}/>
                {codigoEscaneado.length} dígitos
              </span>
            )}
            {busqueda && !modoEscaneo && (
              <span className="badge bg-info ms-2">
                {busqueda.length > 6 ? `${busqueda.slice(0,6)}...` : busqueda}
              </span>
            )}
          </h6>
        </div>
        
        <div className="mb-3">
          <input
            ref={inputRef} // ⭐ USAR REF
            className={`form-control form-control-lg ${
              modoEscaneo 
                ? 'border-warning border-3 shadow bg-warning bg-opacity-10' 
                : busquedaInput ? 'border-success shadow-sm' : ''
            }`}
            placeholder={
              modoEscaneo 
                ? "⚡ Escaneando código de barras..." 
                : "🔤 Nombre o código del producto (Enter)"
            }
            value={modoEscaneo ? `Código: ${codigoEscaneado}` : busquedaInput}
            onChange={handleManualInput}
            onKeyDown={handleManualEnter}
            disabled={modoEscaneo}
            autoFocus // ⭐ Mantener como respaldo
          />
        </div>

        {mensajeError && (
          <div className="alert alert-danger alert-dismissible fade show p-2 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"/>
            <strong>{mensajeError}</strong>
            <button 
              type="button" 
              className="btn-close btn-close-sm" 
              onClick={() => setMensajeError('')}
              style={{ fontSize: '0.7rem', padding: '0.5rem' }}
            />
          </div>
        )}

        {/* LISTA FILTRADA (MODO MANUAL) */}
        {!modoEscaneo && productosFiltrados.length > 0 && (
          <div className="table-responsive" style={{ maxHeight: '200px', overflow: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: '70%' }}>Producto</th>
                  <th className="text-end">Precio</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p, index) => (
                  <tr 
                    key={p.id} 
                    className={index === 0 ? 'table-active' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      manejarSeleccionProducto(p);
                      setBusquedaInput('');
                      setMensajeError('');
                    }}
                  >
                    <td className="text-truncate pe-3" style={{ maxWidth: '220px' }}>
                      <div className="fw-semibold">{p.descripcion}</div>
                      <small className="text-muted">#{p.codigo}</small>
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-success fs-5">
                        {formatMoney(p.precio ?? 0)}
                      </div>
                      <small className="text-muted">Stock: {p.cantidad ?? 0}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="p-2 small text-center text-muted border-top">
              {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}
              {productosFiltrados.length === 1 && ' - Enter para agregar'}
            </div>
          </div>
        )}
        
        {/* INDICADOR VISUAL MODO ESCÁNER */}
        {modoEscaneo && (
          <div className="alert alert-warning p-3 mb-0 d-flex align-items-center">
            <div className="spinner-border text-warning me-3">
              <span className="visually-hidden">Escaneando...</span>
            </div>
            <div className="flex-grow-1">
              <strong className="d-block">Escaneando código de barras</strong>
              <div className="font-monospace fs-3 text-dark mt-2 fw-bold">
                {codigoEscaneado}
              </div>
              <small className="text-muted">
                {codigoEscaneado.length} de ~13 dígitos
              </small>
            </div>
          </div>
        )}

        {/* AYUDA */}
        {!modoEscaneo && !busquedaInput && (
          <div className="small text-muted text-center mt-2">
            <i className="bi bi-info-circle me-1"/>
            Escribe para buscar manualmente o escanea código de barras
          </div>
        )}
      </div>
    </div>
  );
}
