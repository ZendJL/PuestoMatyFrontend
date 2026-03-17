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
    if (!cantidad || cantidad <= 0) {
      alert('Ingresa una cantidad válida mayor a 0');
      return;
    }
    setGuardando(true);
    try {
      console.log('cantidad antes de enviar:', cantidad, typeof cantidad);
      const precioCompra = precioCompraAgregar !== '' ? parseFloat(precioCompraAgregar) : null;
      await axios.post(`/api/productos/${productoSeleccionado.id}/agregar-stock`, null, {
  params: { cantidad, ...(precioCompra !== null && { precioCompra }) },
});
      if (imprimirAlAgregar) {
        await imprimirCodigoBarras(productoSeleccionado);
      }
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      setProductoSeleccionado(prev => prev
        ? { ...prev, cantidad: (prev.cantidad ?? 0) + cantidad }
        : prev
      );
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
    try {
      await imprimirCodigoBarras(productoSeleccionado);
    } catch {
      alert('Error al imprimir');
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div className="row g-2 align-items-end">
      <div className="col-md-3 col-lg-2">
        <label className="form-label fw-semibold small mb-1">Cantidad</label>
        <input
          type="number"
          className="form-control form-control-sm"
          min="1"
          placeholder="Ej: 12"
          value={cantidadAgregar}
          onChange={(e) => setCantidadAgregar(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAgregarInventario()}
        />
      </div>

      <div className="col-md-3 col-lg-2">
        <label className="form-label fw-semibold small mb-1">Costo unitario</label>
        <div className="input-group input-group-sm">
          <span className="input-group-text">$</span>
          <input
            type="number"
            className="form-control"
            min="0" step="0.01"
            placeholder="Opcional"
            value={precioCompraAgregar}
            onChange={(e) => setPrecioCompraAgregar(e.target.value)}
          />
        </div>
      </div>

      <div className="col-md-3 col-lg-2 d-flex align-items-end pb-1">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="imprimirAlAgregar"
            checked={imprimirAlAgregar}
            onChange={(e) => setImprimirAlAgregar(e.target.checked)}
          />
          <label className="form-check-label small fw-semibold" htmlFor="imprimirAlAgregar">
            Imprimir al agregar
          </label>
        </div>
      </div>

      <div className="col-md-auto d-flex gap-2">
        <button
          className="btn btn-success btn-sm fw-bold"
          onClick={handleAgregarInventario}
          disabled={guardando || !cantidadAgregar}
        >
          {guardando
            ? <><span className="spinner-border spinner-border-sm me-1" />Guardando...</>
            : <><i className="bi bi-plus-circle-fill me-1" />Agregar al inventario</>}
        </button>

        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={handleReimprimirCodigo}
          disabled={imprimiendo}
          title="Reimprimir código de barras"
        >
          {imprimiendo
            ? <span className="spinner-border spinner-border-sm" />
            : <><i className="bi bi-printer me-1" />Reimprimir</>}
        </button>
      </div>
    </div>
  );
}
