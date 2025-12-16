export default function CuentaPrestamo({
  cuentas,
  cuentaSeleccionada,
  setCuentaSeleccionada,
  busquedaCuenta,
  setBusquedaCuenta,
  formatMoney,
}) {
  const filtradas = (cuentas || [])
    .filter((c) =>
      c.nombre?.toLowerCase().includes(busquedaCuenta.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div className="mb-3 border rounded p-2 bg-body-tertiary">
      <div className="fw-semibold mb-1">Cuenta del cliente</div>
      <input
        className="form-control form-control-sm mb-1"
        placeholder="Buscar por nombre..."
        value={busquedaCuenta}
        onChange={(e) => setBusquedaCuenta(e.target.value)}
      />
      {busquedaCuenta && (
        <div
          className="border rounded small bg-body"
          style={{ maxHeight: 140, overflowY: 'auto' }}
        >
          <table className="table table-sm mb-0">
            <tbody>
              {filtradas.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  className={
                    cuentaSeleccionada?.id === c.id ? 'table-primary' : ''
                  }
                  onClick={() => {
                    setCuentaSeleccionada(c);
                    setBusquedaCuenta(c.nombre);
                  }}
                >
                  <td>
                    <div className="fw-semibold">{c.nombre}</div>
                    <div className="small ">
                      Saldo: {formatMoney(c.saldo ?? 0)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cuentaSeleccionada && (
        <div className="small text-body-secondary mt-1">
          Seleccionada: <strong>{cuentaSeleccionada.nombre}</strong> (saldo{' '}
          {formatMoney(cuentaSeleccionada.saldo ?? 0)})
        </div>
      )}
    </div>
  );
}
