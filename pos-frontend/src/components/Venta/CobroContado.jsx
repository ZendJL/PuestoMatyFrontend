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
  pagoMixtoTarjeta, setPagoMixtoTarjeta,
}) {
  const { tasaCambio, setTasaCambio } = useTasaCambio();
  const [tasaInput, setTasaInput] = useState(String(tasaCambio));
  const { theme } = useTheme();

  useEffect(() => { setTasaInput(String(tasaCambio)); }, [tasaCambio]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* TASA DE CAMBIO — siempre visible */}
      <div className="p-2 rounded border" style={{ background: 'var(--bs-body-bg, #fff)' }}>
        <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>
          💱 Tipo de cambio
        </label>
        <div className="input-group input-group-sm">
          <span className="input-group-text fw-bold">$1 USD =</span>
          <input
            type="number" min="1" step="0.5"
            className="form-control fw-bold"
            style={{ fontSize: '1rem' }}
            value={tasaInput}
            onChange={(e) => setTasaInput(e.target.value)}
            onBlur={() => { if (!tasaInput || Number(tasaInput) <= 0) setTasaInput(String(tasaCambio)); }}
          />
          <span className="input-group-text">MXN</span>
          <button
            className="btn btn-success btn-sm fw-bold"
            type="button"
            onClick={() => { const n = Number(tasaInput); if (n > 0) setTasaCambio(n); }}
          >💾 Guardar</button>
        </div>
      </div>

      {/* SELECTOR MODO DE PAGO */}
      <div>
        <label className="form-label fw-semibold mb-1" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 1 }}>Forma de pago</label>
        <div className="btn-group w-100" role="group">
          {[
            { key: MODO_PAGO.PESOS,   label: '🇲🇽 Pesos',  color: 'primary' },
            { key: MODO_PAGO.DOLARES, label: '🇺🇸 USD',    color: 'success' },
            { key: MODO_PAGO.MIXTO,   label: '🔀 Mixto',   color: 'warning' },
            { key: MODO_PAGO.TARJETA, label: '💳 Tarjeta', color: 'info' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              className={`btn fw-bold ${modoPago === key ? `btn-${color}` : `btn-outline-${color}`}`}
              onClick={() => setModoPago(key)}
              style={{ fontSize: '0.95rem', padding: '10px 4px' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* PAGO EN PESOS */}
      {modoPago === MODO_PAGO.PESOS && (
        <div>
          <label className="form-label fw-semibold mb-1">Pago del cliente (MXN)</label>
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
          <div className="d-flex flex-wrap gap-2 mt-2">
            {DENOMINACIONES.map((monto) => (
              <button key={monto} type="button"
                className="btn btn-outline-primary fw-bold"
                style={{ fontSize: '1rem', minWidth: '64px', padding: '8px 10px' }}
                onClick={() => aplicarDenominacion(monto)}>
                {formatMoney(monto)}
              </button>
            ))}
          </div>
          {Number(pagoCliente) > 0 && cambio >= 0 && (
            <div className={`p-2 rounded d-flex justify-content-between align-items-center mt-2 ${cambio === 0 ? 'bg-info-subtle' : 'bg-success-subtle'}`}>
              <span className={`fw-bold ${cambio === 0 ? 'text-info' : 'text-success'}`}>Cambio:</span>
              <span className={`fs-4 fw-bold ${cambio === 0 ? 'text-info' : 'text-success'}`}>{formatMoney(cambio)}</span>
            </div>
          )}
        </div>
      )}

      {/* PAGO EN DÓLARES */}
      {modoPago === MODO_PAGO.DOLARES && (
        <div>
          <label className="form-label fw-semibold mb-1">Pago del cliente (USD)</label>
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
          {(() => {
            const pagadoMXN = Number(pagoDolares) * tasaCambio;
            const faltaMXN = total - pagadoMXN;
            const faltaUSD = faltaMXN / tasaCambio;
            const cambioMXN = pagadoMXN - total;
            const cambioUSD = cambioMXN / tasaCambio;
            return faltaMXN > 0.009 ? (
              <div className="alert alert-danger py-2 mb-0 mt-2">
                <div className="d-flex justify-content-between">
                  <span>❌ Falta:</span>
                  <span className="fw-bold">{formatMoney(faltaMXN)} / ${faltaUSD.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <div className="alert alert-success py-2 mb-0 mt-2">
                <div className="d-flex justify-content-between">
                  <span>✅ Cambio:</span>
                  <span className="fw-bold">{formatMoney(cambioMXN)} / ${cambioUSD.toFixed(2)} USD</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* PAGO MIXTO — pesos + dólares + tarjeta */}
      {modoPago === MODO_PAGO.MIXTO && (
        <div>
          <div className="mb-2">
            <label className="form-label fw-semibold mb-1">Pesos (MXN)</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-primary text-white fw-bold">$</span>
              <input type="number" min="0" step="0.01" className="form-control"
                value={pagoMixtoPesos} onChange={(e) => setPayoMixtoPesos(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label fw-semibold mb-1">Dólares (USD)</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-success text-white fw-bold">USD</span>
              <input type="number" min="0" step="0.01" className="form-control"
                value={pagoMixtoDolares} onChange={(e) => setPagoMixtoDolares(e.target.value)} placeholder="0.00" />
            </div>
            {pagoMixtoDolares > 0 && (
              <small className="text-muted mt-1 d-block">= {formatMoney(Number(pagoMixtoDolares) * tasaCambio)} MXN</small>
            )}
          </div>
          <div className="mb-2">
            <label className="form-label fw-semibold mb-1">Tarjeta (MXN)</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-info text-white fw-bold">💳</span>
              <input type="number" min="0" step="0.01" className="form-control"
                value={pagoMixtoTarjeta} onChange={(e) => setPagoMixtoTarjeta(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          {(() => {
            const totalPagadoMXN =
              (Number(pagoMixtoPesos) || 0) +
              (Number(pagoMixtoDolares) || 0) * tasaCambio +
              (Number(pagoMixtoTarjeta) || 0);
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
        </div>
      )}

      {/* TARJETA */}
      {modoPago === MODO_PAGO.TARJETA && (
        <div className="alert alert-info py-3 mb-0 text-center">
          <i className="bi bi-credit-card fs-2 d-block mb-2 text-info" />
          <div className="fw-bold fs-5">Cobro con tarjeta</div>
          <div className="fs-4 fw-bold text-info mt-1">{formatMoney(total)}</div>
        </div>
      )}

    </div>
  );
}
