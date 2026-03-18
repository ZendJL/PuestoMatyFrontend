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

  const handleCodigoInput = (e) => {
    const valor = e.target.value;
    if (valor === '' || /^\d+$/.test(valor)) { setBusquedaCodigo(valor); setMensajeError(''); }
  };
  const handleNombreInput = (e) => { setBusquedaNombre(e.target.value); setMensajeError(''); };

  const handleCodigoEnter = (e) => {
    if (e.key === 'Enter' && busquedaCodigo.trim() && productosFiltradosCodigo.length > 0) {
      e.preventDefault();
      manejarSeleccionProducto(productosFiltradosCodigo[0]);
      setBusquedaCodigo(''); setBusquedaNombre(''); setProductosFiltradosCodigo([]);
    }
  };
  const handleNombreEnter = (e) => {
    if (e.key === 'Enter' && !modoEscaneo && productosFiltrados.length > 0) {
      e.preventDefault();
      manejarSeleccionProducto(productosFiltrados[0]);
      setBusquedaNombre(''); setBusquedaCodigo('');
    }
  };
  const manejarSeleccionCodigo = (producto) => {
    manejarSeleccionProducto(producto);
    setBusquedaCodigo(''); setBusquedaNombre(''); setProductosFiltradosCodigo([]);
  };

  const listaResultados = !modoEscaneo && (productosFiltrados.length > 0 || productosFiltradosCodigo.length > 0);
  const lista = productosFiltradosCodigo.length > 0 ? productosFiltradosCodigo : productosFiltrados;
  const esPorCodigo = productosFiltradosCodigo.length > 0;

  return (
    <div className="card shadow-sm flex-shrink-0" style={{ border: modoEscaneo ? '2px solid #ffc107' : undefined }}>
      <div className="card-body p-2">
        <div className="row g-2">
          <div className="col-5">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-upc-scan me-1" />Código
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              className={`form-control form-control-lg ${
                modoEscaneo ? 'border-warning border-2 bg-warning bg-opacity-10' :
                busquedaCodigo ? 'border-info border-2' : ''
              }`}
              placeholder={modoEscaneo ? '⚡ Escaneando...' : 'Código...'}
              value={modoEscaneo ? codigoEscaneado : busquedaCodigo}
              onChange={handleCodigoInput}
              onKeyDown={handleCodigoEnter}
              disabled={modoEscaneo}
              autoFocus
            />
          </div>
          <div className="col-7">
            <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem' }}>
              <i className="bi bi-tag me-1" />Nombre del producto
            </label>
            <input
              type="text"
              className={`form-control form-control-lg ${
                busquedaNombre ? 'border-primary border-2' : ''
              }`}
              placeholder="Buscar por nombre..."
              value={busquedaNombre}
              onChange={handleNombreInput}
              onKeyDown={handleNombreEnter}
              disabled={modoEscaneo}
            />
          </div>
        </div>

        {modoEscaneo && (
          <div className="alert alert-warning py-2 px-3 mt-2 mb-0 d-flex align-items-center gap-2">
            <span className="spinner-border spinner-border-sm text-warning" />
            <span className="fw-bold">Escaneando:</span>
            <span className="font-monospace fw-bold fs-5">{codigoEscaneado}</span>
          </div>
        )}

        {listaResultados && (
          <div className="mt-2 border rounded" style={{ maxHeight: '180px', overflowY: 'auto' }}>
            <table className="table table-hover mb-0" style={{ fontSize: '0.95rem' }}>
              <thead className={`sticky-top ${esPorCodigo ? 'table-info' : 'table-light'}`}>
                <tr>
                  <th>Producto</th>
                  <th className="text-end">Precio</th>
                  <th className="text-center" style={{ width: 70 }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr
                    key={p.id}
                    className={i === 0 ? 'table-active' : ''}
                    style={{ cursor: 'pointer', height: '48px' }}
                    onClick={() => esPorCodigo ? manejarSeleccionCodigo(p) : (() => {
                      manejarSeleccionProducto(p);
                      setBusquedaNombre(''); setBusquedaCodigo('');
                    })()}
                  >
                    <td className="align-middle">
                      <div className="fw-semibold">{p.descripcion}</div>
                      <small className="text-muted">#{p.codigo}</small>
                    </td>
                    <td className="align-middle text-end fw-bold text-success fs-6">{formatMoney(p.precio ?? 0)}</td>
                    <td className="align-middle text-center fw-semibold">{p.cantidad ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!modoEscaneo && !busquedaCodigo && !busquedaNombre && (
          <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
            <i className="bi bi-info-circle me-1" />
            Escribe el código o nombre · Escanea automáticamente
          </div>
        )}
      </div>
    </div>
  );
}
