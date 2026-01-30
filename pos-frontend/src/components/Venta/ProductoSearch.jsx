import { useState, useEffect } from 'react';

export default function ProductoSearch({
  busquedaCodigo,
  setBusquedaCodigo,
  busquedaNombre,
  setBusquedaNombre,
  productosFiltrados,
  manejarSeleccionProducto,
  formatMoney,
  codigoEscaneado,
  inputRef,
  productos,
}) {
  const [mensajeError, setMensajeError] = useState('');
  const [productosFiltradosCodigo, setProductosFiltradosCodigo] = useState([]);
  
  const modoEscaneo = codigoEscaneado.length > 0;

  // ⭐ BUSCAR PRODUCTOS POR CÓDIGO (igual que por nombre)
  useEffect(() => {
    if (busquedaCodigo.trim()) {
      const filtrados = productos.filter(p => 
        p.codigo?.toString().toLowerCase().includes(busquedaCodigo.toLowerCase().trim())
      );
      setProductosFiltradosCodigo(filtrados);
      setMensajeError('');
    } else {
      setProductosFiltradosCodigo([]);
    }
  }, [busquedaCodigo, productos]);

  // ⭐ HANDLER PARA INPUT DE CÓDIGO (solo números, NO limpia nombre)
  const handleCodigoInput = (e) => {
    const valor = e.target.value;
    if (valor === '' || /^\d+$/.test(valor)) {
      setBusquedaCodigo(valor);
      // ⭐ NO limpiar nombre para permitir búsqueda manual
      // setBusquedaNombre('');
      setMensajeError('');
    }
  };

  // ⭐ HANDLER PARA INPUT DE NOMBRE (NO limpia código)
  const handleNombreInput = (e) => {
    const valor = e.target.value;
    setBusquedaNombre(valor);
    // ⭐ NO limpiar código para permitir búsqueda manual
    // setBusquedaCodigo('');
    setMensajeError('');
  };

  // ⭐ ENTER EN INPUT DE CÓDIGO: agregar primer resultado si existe
  const handleCodigoEnter = (e) => {
    if (e.key === 'Enter' && busquedaCodigo.trim() && productosFiltradosCodigo.length > 0) {
      e.preventDefault();
      manejarSeleccionProducto(productosFiltradosCodigo[0]);
      setBusquedaCodigo('');
      setBusquedaNombre('');
      setProductosFiltradosCodigo([]);
      setMensajeError('');
    }
  };

  // ⭐ ENTER EN INPUT DE NOMBRE: agregar primer resultado
  const handleNombreEnter = (e) => {
    if (e.key === 'Enter' && !modoEscaneo && productosFiltrados.length > 0) {
      e.preventDefault();
      manejarSeleccionProducto(productosFiltrados[0]);
      setBusquedaNombre('');
      setBusquedaCodigo('');
      setMensajeError('');
    }
  };

  // ⭐ LIMPIAR AL SELECCIONAR DE LA LISTA POR CÓDIGO
  const manejarSeleccionCodigo = (producto) => {
    manejarSeleccionProducto(producto);
    setBusquedaCodigo('');
    setBusquedaNombre('');
    setProductosFiltradosCodigo([]);
    setMensajeError('');
  };

  return (
    <div className="card border-start border-success border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className={`bi bi-search me-2 ${
              modoEscaneo ? 'text-warning' : 'text-success'
            }`}/>
            {modoEscaneo ? '🔢 ESCÁNER ACTIVO' : '🔍 Buscar Producto'}
            {/* BADGES ACTUALIZADOS */}
            {modoEscaneo && (
              <span className="badge bg-warning text-dark ms-2">
                <span className="spinner-border spinner-border-sm me-1" 
                      style={{ width: '0.8rem', height: '0.8rem' }}/>
                {codigoEscaneado.length} dígitos
              </span>
            )}
            {busquedaCodigo && !modoEscaneo && (
              <span className="badge bg-info ms-2">
                Código: {busquedaCodigo}
                {productosFiltradosCodigo.length > 0 && (
                  <span className="ms-1 badge bg-success badge-sm">
                    {productosFiltradosCodigo.length}
                  </span>
                )}
              </span>
            )}
            {busquedaNombre && !modoEscaneo && (
              <span className="badge bg-primary ms-2">
                Nombre: {busquedaNombre.slice(0, 10)}{busquedaNombre.length > 10 ? '...' : ''}
              </span>
            )}
          </h6>
        </div>
        
        {/* ⭐ INPUT DE CÓDIGO */}
        <div className="mb-2">
          <label className="form-label small fw-semibold mb-1">
            <i className="bi bi-upc-scan me-1"/>
            Buscar por Código (escribe + Enter)
          </label>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            className={`form-control form-control-lg ${
              modoEscaneo 
                ? 'border-warning border-3 shadow bg-warning bg-opacity-10' 
                : busquedaCodigo ? 'border-info border-2 shadow-sm' : ''
            }`}
            placeholder={
              modoEscaneo 
                ? "⚡ Escaneando código de barras..." 
                : "Código del producto (Enter para agregar)"
            }
            value={modoEscaneo ? `${codigoEscaneado}` : busquedaCodigo}
            onChange={handleCodigoInput}
            onKeyDown={handleCodigoEnter}
            disabled={modoEscaneo}
            autoFocus
          />
        </div>

        {/* ⭐ INPUT DE NOMBRE */}
        <div className="mb-3">
          <label className="form-label small fw-semibold mb-1">
            <i className="bi bi-tag me-1"/>
            O buscar por Nombre (instantáneo)
          </label>
          <input
            type="text"
            className={`form-control form-control-lg ${
              busquedaNombre ? 'border-primary border-2 shadow-sm' : ''
            }`}
            placeholder="Nombre del producto"
            value={busquedaNombre}
            onChange={handleNombreInput}
            onKeyDown={handleNombreEnter}
            disabled={modoEscaneo}
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
            />
          </div>
        )}

        {/* ⭐ LISTA POR NOMBRE */}
        {!modoEscaneo && productosFiltrados.length > 0 && (
          <div className="table-responsive mb-3" style={{ maxHeight: '200px', overflow: 'auto' }}>
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
                      setBusquedaNombre('');
                      setBusquedaCodigo('');
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
            </div>
          </div>
        )}

        {/* ⭐ LISTA POR CÓDIGO (NUEVA) */}
        {!modoEscaneo && productosFiltradosCodigo.length > 0 && (
          <div className="table-responsive mb-3" style={{ maxHeight: '200px', overflow: 'auto' }}>
            <table className="table table-sm table-hover mb-0">
              <thead className="table-info sticky-top">
                <tr>
                  <th style={{ width: '70%' }}>Producto (Código)</th>
                  <th className="text-end">Precio</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltradosCodigo.map((p, index) => (
                  <tr 
                    key={p.id} 
                    className={index === 0 ? 'table-active' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => manejarSeleccionCodigo(p)}
                  >
                    <td className="text-truncate pe-3" style={{ maxWidth: '220px' }}>
                      <div className="fw-semibold">{p.descripcion}</div>
                      <small className="text-muted font-monospace">#{p.codigo}</small>
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
            <div className="p-2 small text-center text-muted border-top bg-info bg-opacity-10">
              {productosFiltradosCodigo.length} resultado{productosFiltradosCodigo.length !== 1 ? 's' : ''} por código • Enter o click para agregar
            </div>
          </div>
        )}

        {/* MODO ESCÁNER */}
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

        {/* AYUDA ACTUALIZADA */}
        {!modoEscaneo && !busquedaCodigo && !busquedaNombre && (
          <div className="small text-muted text-center mt-2">
            <i className="bi bi-info-circle me-1"/>
            🔢 Código: escribe números (lista instantánea) + Enter • 📝 Nombre: instantáneo • ⚡ Escanea automáticamente
          </div>
        )}
      </div>
    </div>
  );
}
