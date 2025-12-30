import { formatMoney } from '../../utils/format';

export default function ProductoSearchProductos({
  productosFiltrados,
  busquedaProducto,
  setBusquedaProducto,
  productoSeleccionado,
  seleccionarProducto,
  codigoEscaneado, // ⭐ NUEVO
  inputBusquedaRef, // ⭐ RECIBIR REF
}) {
  const modoEscaneo = codigoEscaneado.length > 0;

  const handleManualEnter = (e) => {
    if (e.key === 'Enter' && !modoEscaneo && productosFiltrados.length === 1) {
      e.preventDefault();
      seleccionarProducto(productosFiltrados[0]);
    }
  };

  return (
    <div className="card border-start border-info border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className={`bi bi-search me-2 ${
              modoEscaneo ? 'text-warning' : 'text-info'
            }`}/>
            {modoEscaneo ? '🔢 ESCÁNER ACTIVO' : '🔍 Buscar Producto'}
            {modoEscaneo && (
              <span className="badge bg-warning text-dark ms-2">
                <span className="spinner-border spinner-border-sm me-1" 
                      style={{ width: '0.8rem', height: '0.8rem' }}/>
                {codigoEscaneado.length} dígitos
              </span>
            )}
          </h6>
        </div>
        
        <input
          ref={inputBusquedaRef} // ⭐ USAR REF
          type="text"
          className={`form-control form-control-lg mb-3 ${
            modoEscaneo 
              ? 'border-warning border-3 bg-warning bg-opacity-10' 
              : ''
          }`}
          placeholder={
            modoEscaneo
              ? "⚡ Escaneando código..."
              : "🔍 Escribe código o descripción... (⏎=Enter)"
          }
          value={modoEscaneo ? `Código: ${codigoEscaneado}` : busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
          onKeyDown={handleManualEnter}
          disabled={modoEscaneo}
          autoFocus
        />

        {/* INDICADOR MODO ESCÁNER */}
        {modoEscaneo && (
          <div className="alert alert-warning p-3 mb-3 d-flex align-items-center">
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

        {/* LISTA FILTRADA */}
        {!modoEscaneo && busquedaProducto && productosFiltrados.length > 0 && (
          <div className="table-responsive" style={{ maxHeight: '250px', overflow: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Producto</th>
                  <th className="text-end">Precio</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className={productoSeleccionado?.id === p.id ? 'table-primary' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => seleccionarProducto(p)}
                  >
                    <td className="text-truncate pe-3" style={{ maxWidth: '220px' }}>
                      <div className="fw-bold">{p.descripcion}</div>
                      <small>#{p.codigo}</small>
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-success">{formatMoney(p.precio ?? 0)}</div>
                      <div className="small">
                        {p.cantidad} und | 
                        <span className={`ms-1 badge fs-6 px-2 py-1 fw-semibold ${
                          p.activo === false ? 'bg-danger text-white' : 'bg-success text-white'
                        }`}>
                          {p.activo === false ? 'Inactivo' : 'Activo'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* AYUDA */}
        {!modoEscaneo && !busquedaProducto && (
          <div className="small text-muted text-center mt-2">
            <i className="bi bi-info-circle me-1"/>
            Escribe para buscar manualmente o escanea código de barras
          </div>
        )}
      </div>
    </div>
  );
}
