import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { imprimirCodigoBarras } from '../../utils/PrintBarcode';

export default function ProductosPanel({
  productoSeleccionado,
  cantidadAgregar,
  setCantidadAgregar,
  precioCompraAgregar,
  setPrecioCompraAgregar,
  limpiarSeleccion,
  setProductoSeleccionado,
}) {
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [imprimirAlAgregar, setImprimirAlAgregar] = useState(false);

  if (!productoSeleccionado) return null;

  const handleAgregarInventario = async () => {
    const cantidad = parseInt(cantidadAgregar, 10);
    if (!cantidad || cantidad <= 0) { alert('Ingresa una cantidad válida mayor a 0'); return; }
    setGuardando(true);
    try {
      const precioCompra = precioCompraAgregar !== '' ? parseFloat(precioCompraAgregar) : null;
      await axios.post(`/api/productos/${productoSeleccionado.id}/agregar-stock`, null, {
        params: { cantidad, ...(precioCompra !== null && { precioCompra }) },
      });
      if (imprimirAlAgregar) await imprimirCodigoBarras(productoSeleccionado);
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      setProductoSeleccionado(prev => prev ? { ...prev, cantidad: (prev.cantidad ?? 0) + cantidad } : prev);
      setCantidadAgregar('');
      alert(`✅ Inventario actualizado: +${cantidad} unidades`);
    } catch (err) {
      alert('Error al agregar al inventario: ' + (err.response?.data?.message || err.message));
    } finally {
      setGuardando(false);
    }
  };

  const handleReimprimirCodigo = async () => {
    setImprimiendo(true);
    try { await imprimirCodigoBarras(productoSeleccionado); }
    catch { alert('Error al imprimir'); }
    finally { setImprimiendo(false); }
  };

  return (
    <div className="row g-3 align-items-end">
      <div className="col-md-3">
        <label className="form-label fw-bold mb-1">Cantidad a agregar</label>
        <input
          type="number"
          className="form-control form-control-lg"
          min="1"
          placeholder="Ej: 12"
          value={cantidadAgregar}
          onChange={e => setCantidadAgregar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAgregarInventario()}
          style={{ fontSize: '1.2rem', height: 52 }}
        />
      </div>

      <div className="col-md-3">
        <label className="form-label fw-bold mb-1">Costo unitario (opcional)</label>
        <div className="input-group input-group-lg">
          <span className="input-group-text fw-bold">$</span>
          <input
            type="number"
            className="form-control"
            min="0" step="0.01"
            placeholder="0.00"
            value={precioCompraAgregar}
            onChange={e => setPrecioCompraAgregar(e.target.value)}
            style={{ fontSize: '1.1rem', height: 52 }}
          />
        </div>
      </div>

      <div className="col-md-3 d-flex align-items-center" style={{ paddingTop: 28 }}>
        <div className="form-check form-check-lg">
          <input
            className="form-check-input"
            type="checkbox"
            id="imprimirAlAgregar"
            checked={imprimirAlAgregar}
            onChange={e => setImprimirAlAgregar(e.target.checked)}
            style={{ width: 22, height: 22 }}
          />
          <label className="form-check-label fw-semibold ms-2" htmlFor="imprimirAlAgregar" style={{ fontSize: '1rem' }}>
            Imprimir código al agregar
          </label>
        </div>
      </div>

      <div className="col-md-3 d-flex gap-2">
        <button
          className="btn btn-success btn-lg fw-bold flex-fill"
          onClick={handleAgregarInventario}
          disabled={guardando || !cantidadAgregar}
          style={{ height: 52 }}
        >
          {guardando
            ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</>
            : <><i className="bi bi-plus-circle-fill me-2" />Agregar</>}
        </button>
        <button
          className="btn btn-outline-secondary btn-lg"
          onClick={handleReimprimirCodigo}
          disabled={imprimiendo}
          title="Reimprimir código de barras"
          style={{ height: 52, minWidth: 52 }}
        >
          {imprimiendo ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-printer fs-5" />}
        </button>
      </div>
    </div>
  );
}
