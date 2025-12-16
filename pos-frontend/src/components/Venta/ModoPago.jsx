export default function ModoPago({ modoPrestamo, setModoPrestamo }) {
  return (
    <div className="mb-3 border rounded p-2 bg-body-tertiary">
      <div className="fw-semibold mb-1">Modo de pago</div>
      <div className="form-check">
        <input
          className="form-check-input"
          type="radio"
          name="modoPago"
          id="modoContado"
          checked={!modoPrestamo}
          onChange={() => setModoPrestamo(false)}
        />
        <label className="form-check-label" htmlFor="modoContado">
          Contado
        </label>
      </div>
      <div className="form-check mt-1">
        <input
          className="form-check-input"
          type="radio"
          name="modoPago"
          id="modoPrestamo"
          checked={modoPrestamo}
          onChange={() => setModoPrestamo(true)}
        />
        <label className="form-check-label" htmlFor="modoPrestamo">
          Préstamo / Por pagar
        </label>
      </div>
    </div>
  );
}
