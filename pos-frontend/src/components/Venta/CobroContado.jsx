import { useState, useEffect } from 'react';
import { useTasaCambio } from '../../context/TasaCambioContext';
import { useTheme } from '../../hooks/useTheme';

const MODO_PAGO = {
  PESOS: 'PESOS',
  DOLARES: 'DOLARES',
  MIXTO: 'MIXTO',
  TARJETA: 'TARJETA',  // ← nuevo
};

export default function CobroContado({
  pagoCliente,
  setPagoCliente,
  cambio,
  formatMoney,
  DENOMINACIONES,
  aplicarDenominacion,
  total,
  modoPago,
  setModoPago,
  pagoDolares,
  setPagoDolares,
  pagoMixtoPesos,
  setPayoMixtoPesos,
  pagoMixtoDolares,
  setPagoMixtoDolares,
}) {
  const { tasaCambio, setTasaCambio } = useTasaCambio();
  const [tasaInput, setTasaInput] = useState(String(tasaCambio));
  const { theme } = useTheme();

  const bg = theme === 'dark' ? 'bg-secondary bg-opacity-25' : 'bg-light';
  const cardBg = theme === 'dark' ? 'bg-dark text-light' : '';

  useEffect(() => {
    setTasaInput(String(tasaCambio));
  }, [tasaCambio]);

  return (
    <div className={`card border-start border-primary border-3 shadow-sm mb-3 ${cardBg}`}>
      <div className="card-body p-3">

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">
            <i className="bi bi-cash-stack me-2 text-primary" />Cobro
          </h6>
        </div>

        {/* TASA DE CAMBIO */}
        <div className={`mb-3 p-2 ${bg} rounded`}>
          <label className={`form-label fw-semibold mb-1 small ${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
            <i className="bi bi-currency-dollar me-1 text-success"/>Tasa de cambio (USD → MXN)
          </label>
          <div className="input-group input-group-sm">
            <span className="input-group-text">$1 USD =</span>
            <input
              type="number"
              min="1"
              step="0.5"
              className="form-control"
              value={tasaInput}
              onChange={(e) => setTasaInput(e.target.value)}
              onBlur={() => {
                if (tasaInput === '' || Number(tasaInput) <= 0) {
                  setTasaInput(String(tasaCambio));
                }
              }}
            />
            <span className="input-group-text">MXN</span>
            <button
              className="btn btn-success btn-sm"
              type="button"
              onClick={() => {
                const nueva = Number(tasaInput);
                if (nueva > 0) {
                  setTasaCambio(nueva);
                } else {
                  setTasaInput(String(tasaCambio));
                }
              }}
              title="Guardar tasa"
            >
              💾
            </button>
          </div>
          <small className={theme === 'dark' ? 'text-light text-opacity-50' : 'text-muted'} style={{ fontSize: '0.7rem' }}>
            {tasaInput !== String(tasaCambio)
              ? <span className="text-danger fw-semibold">
                  <i className="bi bi-exclamation-circle-fill me-1"/>Sin guardar — presiona 💾
                </span>
              : <span><i className="bi bi-cloud-check me-1"/>Guardado</span>
            }
          </small>
        </div>

        {/* SELECTOR MODO DE PAGO */}
        <div className="mb-3">
          <label className="form-label fw-semibold mb-2 small">Tipo de pago</label>
          <div className="btn-group w-100 flex-wrap" role="group">
            {[
              { key: MODO_PAGO.PESOS,    label: '🇲🇽 Pesos',   color: 'primary' },
              { key: MODO_PAGO.DOLARES,  label: '🇺🇸 Dólares', color: 'success' },
              { key: MODO_PAGO.MIXTO,    label: '🔀 Mixto',    color: 'warning' },
              { key: MODO_PAGO.TARJETA,  label: '💳 Tarjeta',  color: 'info' },  // ← nuevo
            ].map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${modoPago === key ? `btn-${color} text-white` : `btn-outline-${color}`}`}
                onClick={() => setModoPago(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* PAGO EN PESOS */}
        {modoPago === MODO_PAGO.PESOS && (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold mb-2">Pago del cliente (MXN)</label>
              <div className="input-group">
                <span className="input-group-text bg-primary text-white">$</span>
                <input
                  type="number" min="0" step="0.01"
                  className="form-control form-control-lg"
                  value={pagoCliente}
                  onChange={(e) => setPagoCliente(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold mb-2 small">Denominaciones rápidas</label>
              <div className="d-flex flex-wrap gap-1">
                {DENOMINACIONES.map((monto) => (
                  <button key={monto} type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => aplicarDenominacion(monto)}>
                    {formatMoney(monto)}
                  </button>
                ))}
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center p-2 rounded">
              <span className="fw-bold text-primary">Cambio:</span>
              <span className="fs-4 fw-bold text-success">{formatMoney(cambio)}</span>
            </div>
          </>
        )}

        {/* PAGO EN DÓLARES */}
        {modoPago === MODO_PAGO.DOLARES && (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold mb-2">Pago del cliente (USD)</label>
              <div className="input-group">
                <span className="input-group-text bg-success text-white">USD</span>
                <input
                  type="number" min="0" step="0.01"
                  className="form-control form-control-lg"
                  value={pagoDolares}
                  onChange={(e) => setPagoDolares(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {pagoDolares > 0 && (
                <small className="text-muted mt-1 d-block">
                  = {formatMoney(Number(pagoDolares) * tasaCambio)} MXN
                </small>
              )}
            </div>
            {(() => {
              const pagadoMXN = Number(pagoDolares) * tasaCambio;
              const faltaMXN = total - pagadoMXN;
              const faltaUSD = faltaMXN / tasaCambio;
              const cambioMXN = pagadoMXN - total;
              const cambioUSD = cambioMXN / tasaCambio;
              return faltaMXN > 0.009 ? (
                <div className="alert alert-danger py-2 mb-0">
                  <div className="d-flex justify-content-between">
                    <span>❌ Falta:</span>
                    <span className="fw-bold">
                      {formatMoney(faltaMXN)} / ${faltaUSD.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success py-2 mb-0">
                  <div className="d-flex justify-content-between">
                    <span>✅ Cambio:</span>
                    <span className="fw-bold">
                      {formatMoney(cambioMXN)} / ${cambioUSD.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* PAGO MIXTO */}
        {modoPago === MODO_PAGO.MIXTO && (
          <>
            <div className="mb-2">
              <label className="form-label fw-semibold mb-1 small">Pago en pesos (MXN)</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-primary text-white">$</span>
                <input
                  type="number" min="0" step="0.01"
                  className="form-control"
                  value={pagoMixtoPesos}
                  onChange={(e) => setPayoMixtoPesos(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold mb-1 small">Pago en dólares (USD)</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-success text-white">USD</span>
                <input
                  type="number" min="0" step="0.01"
                  className="form-control"
                  value={pagoMixtoDolares}
                  onChange={(e) => setPagoMixtoDolares(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {pagoMixtoDolares > 0 && (
                <small className="text-muted mt-1 d-block">
                  = {formatMoney(Number(pagoMixtoDolares) * tasaCambio)} MXN
                </small>
              )}
            </div>
            {(() => {
              const totalPagadoMXN = Number(pagoMixtoPesos) + Number(pagoMixtoDolares) * tasaCambio;
              const falta = total - totalPagadoMXN;
              const cambioMixto = totalPagadoMXN - total;
              return falta > 0.009 ? (
                <div className="alert alert-danger py-2 mb-0">
                  <div className="d-flex justify-content-between">
                    <span>❌ Falta:</span>
                    <span className="fw-bold">{formatMoney(falta)}</span>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success py-2 mb-0">
                  <div className="d-flex justify-content-between">
                    <span>✅ Cambio:</span>
                    <span className="fw-bold">{formatMoney(cambioMixto)}</span>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* PAGO CON TARJETA ← nuevo */}
        {modoPago === MODO_PAGO.TARJETA && (
          <div className="alert alert-info py-3 mb-0 text-center">
            <i className="bi bi-credit-card fs-2 d-block mb-2 text-info" />
            <div className="fw-bold">Pago con tarjeta</div>
            <div className="fs-5 fw-bold text-info mt-1">{formatMoney(total)}</div>
            <small className="text-muted">El cobro se realiza en terminal</small>
          </div>
        )}

      </div>
    </div>
  );
}
