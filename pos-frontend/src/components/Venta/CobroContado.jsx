import { useState, useEffect } from 'react';
import { useTasaCambio } from '../../context/TasaCambioContext';
import { useTheme } from '../../hooks/useTheme';

const MODO_PAGO = {
  PESOS: 'PESOS',
  DOLARES: 'DOLARES',
  MIXTO: 'MIXTO',
  TARJETA: 'TARJETA',
};

export default function CobroContado({
  pagoCliente, setPagoCliente, cambio, formatMoney, DENOMINACIONES,
  aplicarDenominacion, total, modoPago, setModoPago,
  pagoDolares, setPagoDolares, pagoMixtoPesos, setPayoMixtoPesos,
  pagoMixtoDolares, setPagoMixtoDolares,
}) {
  const { tasaCambio, setTasaCambio } = useTasaCambio();
  const [tasaInput, setTasaInput] = useState(String(tasaCambio));
  const [mostrarTasa, setMostrarTasa] = useState(false);
  const { theme } = useTheme();

  useEffect(() => { setTasaInput(String(tasaCambio)); }, [tasaCambio]);

  return (
    <div className="card flex-shrink-0">
      <div className="card-body p-2">

        {/* SELECTOR MODO DE PAGO */}
        <div className="btn-group w-100 mb-2" role="group">
          {[
            { key: MODO_PAGO.PESOS,   label: '🇲🇽 Pesos',  color: 'primary' },
            { key: MODO_PAGO.DOLARES, label: '🇺🇸 USD',    color: 'success' },
            { key: MODO_PAGO.MIXTO,   label: '🔀 Mixto',   color: 'warning' },
            { key: MODO_PAGO.TARJETA, label: '💳 Tarjeta', color: 'info' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm fw-semibold ${modoPago === key ? `btn-${color}` : `btn-outline-${color}`}`}
              onClick={() => setModoPago(key)}
              style={{ fontSize: '0.8rem' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* PAGO EN PESOS */}
        {modoPago === MODO_PAGO.PESOS && (
          <>
            <div className="mb-2">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>Pago del cliente (MXN)</label>
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-primary text-white fw-bold">$</span>
                <input
                  type="number" min="0" step="0.01"
                  className="form-control"
                  value={pagoCliente}
                  onChange={(e) => setPagoCliente(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {DENOMINACIONES.map((monto) => (
                <button key={monto} type="button"
                  className="btn btn-sm btn-outline-primary fw-semibold"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => aplicarDenominacion(monto)}>
                  {formatMoney(monto)}
                </button>
              ))}
            </div>
            {cambio > 0 && (
              <div className="p-2 rounded bg-success-subtle d-flex justify-content-between align-items-center">
                <span className="fw-bold text-success">Cambio:</span>
                <span className="fs-4 fw-bold text-success">{formatMoney(cambio)}</span>
              </div>
            )}
          </>
        )}

        {/* PAGO EN DÓLARES */}
        {modoPago === MODO_PAGO.DOLARES && (
          <>
            <div className="mb-2">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>Pago del cliente (USD)</label>
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-success text-white fw-bold">USD</span>
                <input
                  type="number" min="0" step="0.01"
                  className="form-control"
                  value={pagoDolares}
                  onChange={(e) => setPagoDolares(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {pagoDolares > 0 && (
                <small className="text-muted mt-1 d-block">= {formatMoney(Number(pagoDolares) * tasaCambio)} MXN</small>
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
                    <span className="fw-bold">{formatMoney(faltaMXN)} / ${faltaUSD.toFixed(2)} USD</span>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success py-2 mb-0">
                  <div className="d-flex justify-content-between">
                    <span>✅ Cambio:</span>
                    <span className="fw-bold">{formatMoney(cambioMXN)} / ${cambioUSD.toFixed(2)} USD</span>
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
              <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>Pesos (MXN)</label>
              <div className="input-group">
                <span className="input-group-text bg-primary text-white">$</span>
                <input type="number" min="0" step="0.01" className="form-control form-control-lg"
                  value={pagoMixtoPesos} onChange={(e) => setPayoMixtoPesos(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>Dólares (USD)</label>
              <div className="input-group">
                <span className="input-group-text bg-success text-white">USD</span>
                <input type="number" min="0" step="0.01" className="form-control form-control-lg"
                  value={pagoMixtoDolares} onChange={(e) => setPagoMixtoDolares(e.target.value)} placeholder="0.00" />
              </div>
              {pagoMixtoDolares > 0 && (
                <small className="text-muted mt-1 d-block">= {formatMoney(Number(pagoMixtoDolares) * tasaCambio)} MXN</small>
              )}
            </div>
            {(() => {
              const totalPagadoMXN = Number(pagoMixtoPesos) + Number(pagoMixtoDolares) * tasaCambio;
              const falta = total - totalPagadoMXN;
              const cambioMixto = totalPagadoMXN - total;
              return falta > 0.009 ? (
                <div className="alert alert-danger py-2 mb-0">
                  <div className="d-flex justify-content-between"><span>❌ Falta:</span><span className="fw-bold">{formatMoney(falta)}</span></div>
                </div>
              ) : (
                <div className="alert alert-success py-2 mb-0">
                  <div className="d-flex justify-content-between"><span>✅ Cambio:</span><span className="fw-bold">{formatMoney(cambioMixto)}</span></div>
                </div>
              );
            })()}
          </>
        )}

        {/* TARJETA */}
        {modoPago === MODO_PAGO.TARJETA && (
          <div className="alert alert-info py-3 mb-0 text-center">
            <i className="bi bi-credit-card fs-2 d-block mb-2 text-info" />
            <div className="fw-bold fs-5">Cobro con tarjeta</div>
            <div className="fs-4 fw-bold text-info mt-1">{formatMoney(total)}</div>
          </div>
        )}

        {/* TASA CAMBIO — colapsable */}
        <div className="mt-2">
          <button
            className="btn btn-link btn-sm text-muted p-0 text-decoration-none"
            style={{ fontSize: '0.75rem' }}
            onClick={() => setMostrarTasa(!mostrarTasa)}
          >
            <i className={`bi bi-chevron-${mostrarTasa ? 'up' : 'down'} me-1`} />
            Tasa de cambio (${tasaCambio} MXN/USD)
          </button>
          {mostrarTasa && (
            <div className="mt-2 p-2 bg-light rounded">
              <div className="input-group input-group-sm">
                <span className="input-group-text">$1 USD =</span>
                <input
                  type="number" min="1" step="0.5"
                  className="form-control"
                  value={tasaInput}
                  onChange={(e) => setTasaInput(e.target.value)}
                  onBlur={() => { if (!tasaInput || Number(tasaInput) <= 0) setTasaInput(String(tasaCambio)); }}
                />
                <span className="input-group-text">MXN</span>
                <button
                  className="btn btn-success btn-sm"
                  type="button"
                  onClick={() => { const n = Number(tasaInput); if (n > 0) setTasaCambio(n); }}
                >💾</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
