export default function ProductoSearchMerma({
  busqueda, setBusqueda, productosFiltrados, agregarItemMerma, 
  manejarSeleccionPorEnter, inputBusquedaRef, tipoMerma, setTipoMerma,
  descripcionMerma, setDescripcionMerma
}) {
  return (
    <div className="card border-start border-primary border-3 shadow-sm mb-3">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-gear-fill me-2 text-primary"/>Configuración
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
          />
        </div>

        {/* Buscador */}
        <label className="form-label fw-semibold mb-2">🔍 Buscar producto</label>
        <input
          ref={inputBusquedaRef}
          className="form-control form-control-lg"
          placeholder="Escanea código o escribe... (Enter)"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && manejarSeleccionPorEnter()}
        />

        {busqueda && productosFiltrados.length > 0 && (
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
      </div>
    </div>
  );
}
