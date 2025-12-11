import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useMemo } from 'react';
import { formatMoney } from '../utils/format'; // ajusta la ruta si es necesario

export default function Productos() {
  const [busqueda, setBusqueda] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);

  const { data: productos, isLoading, error } = useQuery({
    queryKey: ['productos'],
    queryFn: () => axios.get('/api/productos').then((res) => res.data),
    retry: 1,
  });

  if (isLoading) return <div className="p-4 fs-6">Cargando productos...</div>;
  if (error)
    return (
      <div className="p-4 text-danger fs-6">
        Error al cargar productos: {error.message}
      </div>
    );

  const lista = Array.isArray(productos) ? productos : [];
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return lista
      .filter((p) =>
        q
          ? p.descripcion?.toLowerCase().includes(q) ||
            p.codigo?.toLowerCase().includes(q)
          : true
      )
      .filter((p) => (soloActivos ? p.activo !== false : true))
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [lista, busqueda, soloActivos]);

  const totalProductos = lista.length;
  const activos = lista.filter((p) => p.activo !== false).length;

  return (
    <div className="card shadow-sm fs-6">
      <div className="card-header py-2 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Inventario de productos</h5>
          <small className="text-muted">
            Consulta rápida de existencias, precios y estado
          </small>
        </div>
        <div className="text-end small">
          <div>
            Total: <strong>{totalProductos}</strong>
          </div>
          <div className="text-success">
            Activos: <strong>{activos}</strong>
          </div>
        </div>
      </div>

      <div className="card-body py-3">
        {/* Filtros */}
        <div className="row g-2 align-items-end mb-3">
          <div className="col-md-6">
            <label className="form-label mb-1">Buscar producto</label>
            <input
              className="form-control form-control-sm"
              placeholder="Código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <div className="form-check mt-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="soloActivos"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="soloActivos">
                Mostrar solo productos activos
              </label>
            </div>
          </div>
          <div className="col-md-3 text-md-end small text-muted mt-2 mt-md-0">
            {filtrados.length} productos encontrados
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="table-responsive border rounded" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table className="table table-sm table-hover table-striped mb-0 align-middle fs-6">
            <thead className="table-light sticky-top">
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Producto</th>
                <th style={{ width: 110 }}>Código</th>
                <th className="text-end" style={{ width: 110 }}>
                  Precio
                </th>
                <th className="text-end" style={{ width: 110 }}>
                  Inventario
                </th>
                <th style={{ width: 90 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td className="text-muted small">{p.id}</td>
                  <td>
                    <div
                      className="fw-semibold text-truncate"
                      style={{ maxWidth: 260 }}
                    >
                      {p.descripcion}
                    </div>
                    {p.proveedor && (
                      <div className="small text-muted">
                        Prov: {p.proveedor}
                      </div>
                    )}
                  </td>
                  <td className="small">{p.codigo}</td>
                  <td className="text-end fw-semibold text-success">
                    {formatMoney(p.precio)}
                  </td>
                  <td className="text-end">
                    <span
                      className={
                        p.cantidad <= 0
                          ? 'badge bg-danger-subtle text-danger'
                          : p.cantidad < 5
                          ? 'badge bg-warning-subtle text-warning'
                          : 'badge bg-success-subtle text-success'
                      }
                    >
                      {p.cantidad}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        p.activo === false
                          ? 'badge bg-secondary'
                          : 'badge bg-primary-subtle text-primary'
                      }
                    >
                      {p.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-3">
                    No hay productos que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
