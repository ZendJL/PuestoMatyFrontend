import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';

const INVENTARIO_BAJO_UMBRAL = 5;

export default function Proveedores() {
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarCompra, setMostrarCompra] = useState(false);
  const [productoCompra, setProductoCompra] = useState(null);
  const [cantidadCompra, setCantidadCompra] = useState('');
  const [costoCompra, setCostoCompra] = useState('');

  const queryClient = useQueryClient();

  const { data: productosRaw = [], isLoading } = useQuery({
    queryKey: ['productos-altas'],
    queryFn: () => axios.get('/api/productos').then(r => r.data),
    staleTime: 0,
  });

  const productos = useMemo(() =>
    Array.isArray(productosRaw) ? productosRaw
    : Array.isArray(productosRaw?.content) ? productosRaw.content
    : []
  , [productosRaw]);

  const proveedores = useMemo(() => {
    const mapa = new Map();
    productos.forEach(p => {
      const nombre = p.proveedor?.trim() || '(Sin proveedor)';
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre).push(p);
    });
    return Array.from(mapa.entries())
      .map(([nombre, prods]) => ({
        nombre,
        productos: prods,
        totalProductos: prods.length,
        totalInventario: prods.reduce((s, p) => s + (p.cantidad || 0), 0),
        valorInventario: prods.reduce((s, p) => s + (p.cantidad || 0) * (p.precioCompra || p.precio || 0), 0),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [productos]);

  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return proveedores;
    return proveedores.filter(pv =>
      pv.nombre.toLowerCase().includes(q) ||
      pv.productos.some(p => p.descripcion?.toLowerCase().includes(q))
    );
  }, [proveedores, busqueda]);

  const comprarMutation = useMutation({
    mutationFn: ({ id, cantidad, costo }) =>
      axios.post(`/api/productos/${id}/agregar-stock?cantidad=${cantidad}&precioCompra=${costo}`),
    onSuccess: () => {
      alert('✅ Compra registrada e inventario actualizado');
      setMostrarCompra(false);
      setProductoCompra(null);
      setCantidadCompra('');
      setCostoCompra('');
      queryClient.invalidateQueries({ queryKey: ['productos-altas'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    },
    onError: (err) => alert('❌ Error: ' + (err.response?.data?.message || err.message)),
  });

  const handleRegistrarCompra = () => {
    const cant = parseInt(cantidadCompra, 10);
    const costo = parseFloat(costoCompra);
    if (!productoCompra) return;
    if (!cant || cant <= 0) { alert('Cantidad inválida'); return; }
    if (isNaN(costo) || costo < 0) { alert('Costo inválido'); return; }
    comprarMutation.mutate({ id: productoCompra.id, cantidad: cant, costo });
  };

  const provSelec = proveedoresFiltrados.find(p => p.nombre === proveedorSeleccionado);

  if (isLoading) return <div className="text-center py-5">Cargando proveedores...</div>;

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '0.25rem 0' }}>

        <div className="card-header p-2 bg-primary text-white border-bottom-0" style={{ minHeight: '48px' }}>
          <div className="d-flex align-items-center justify-content-between h-100">
            <h6 className="mb-0" style={{ fontSize: '0.95rem' }}>🏭 Proveedores</h6>
            <small className="opacity-75">{proveedores.length} proveedores · {productos.length} productos</small>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">

            <div className="col-lg-4">
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="🔍 Buscar proveedor o producto..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="border rounded p-2 text-center">
                    <div className="small text-muted">Proveedores</div>
                    <div className="fs-4 fw-bold text-primary">{proveedores.length}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="border rounded p-2 text-center">
                    <div className="small text-muted">Valor total</div>
                    <div className="fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                      {formatMoney(proveedores.reduce((s, pv) => s + pv.valorInventario, 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="list-group" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {proveedoresFiltrados.map(pv => (
                  <button
                    key={pv.nombre}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start py-2 ${proveedorSeleccionado === pv.nombre ? 'active' : ''}`}
                    onClick={() => setProveedorSeleccionado(pv.nombre === proveedorSeleccionado ? null : pv.nombre)}
                  >
                    <div>
                      <div className="fw-semibold">{pv.nombre}</div>
                      <small className={proveedorSeleccionado === pv.nombre ? 'text-white-50' : 'text-muted'}>
                        {pv.totalProductos} producto{pv.totalProductos !== 1 ? 's' : ''} · {pv.totalInventario} uds
                      </small>
                    </div>
                    <div className="text-end">
                      <div className={`small fw-bold ${proveedorSeleccionado === pv.nombre ? 'text-white' : 'text-success'}`}>
                        {formatMoney(pv.valorInventario)}
                      </div>
                      {pv.productos.some(p => (p.cantidad ?? 0) <= INVENTARIO_BAJO_UMBRAL) && (
                        <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>⚠️ Inventario bajo</span>
                      )}
                    </div>
                  </button>
                ))}
                {proveedoresFiltrados.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <i className="bi bi-search fs-3 d-block mb-2 opacity-50" />
                    Sin resultados
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-8">
              {!provSelec ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-building fs-1 d-block mb-3 opacity-25" />
                  <h5>Selecciona un proveedor</h5>
                  <p className="small">Haz clic en un proveedor de la lista para ver sus productos</p>
                </div>
              ) : (
                <div className="card shadow-sm">
                  <div className="card-header d-flex justify-content-between align-items-center py-2">
                    <h6 className="mb-0">🏭 {provSelec.nombre}</h6>
                    <div className="d-flex gap-2">
                      <span className="badge bg-primary">{provSelec.totalProductos} productos</span>
                      <span className="badge bg-success">{formatMoney(provSelec.valorInventario)}</span>
                    </div>
                  </div>
                  <div className="card-body p-0" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <table className="table table-hover table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Producto</th>
                          <th className="text-end" style={{ width: 80 }}>Inventario</th>
                          <th className="text-end" style={{ width: 100 }}>Costo</th>
                          <th className="text-end" style={{ width: 100 }}>Precio</th>
                          <th className="text-center" style={{ width: 110 }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provSelec.productos.map(p => {
                          const inventarioBajo = (p.cantidad ?? 0) <= INVENTARIO_BAJO_UMBRAL;
                          return (
                            <tr key={p.id} className={p.activo === false ? 'opacity-50' : ''}>
                              <td>
                                <div className="fw-semibold">{p.descripcion}</div>
                                <small className="text-muted">#{p.codigo}</small>
                                {p.activo === false && (
                                  <span className="badge bg-secondary ms-1" style={{ fontSize: '0.6rem' }}>Inactivo</span>
                                )}
                              </td>
                              <td className="text-end">
                                <span className={`fw-bold ${inventarioBajo ? ((p.cantidad ?? 0) === 0 ? 'text-danger' : 'text-warning') : 'text-success'}`}>
                                  {p.cantidad ?? 0}
                                  {inventarioBajo && <i className="bi bi-exclamation-triangle-fill ms-1" style={{ fontSize: '0.7rem' }} />}
                                </span>
                              </td>
                              <td className="text-end text-muted small">{p.precioCompra ? formatMoney(p.precioCompra) : '—'}</td>
                              <td className="text-end text-success fw-semibold">{formatMoney(p.precio)}</td>
                              <td className="text-center p-1">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setProductoCompra(p);
                                    setCostoCompra(p.precioCompra ? String(p.precioCompra) : '');
                                    setCantidadCompra('');
                                    setMostrarCompra(true);
                                  }}
                                >
                                  <i className="bi bi-plus-circle me-1" />Comprar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {mostrarCompra && productoCompra && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-cart-plus-fill me-2" />Registrar Compra
                </h5>
                <button type="button" className="btn-close btn-close-white"
                  onClick={() => { setMostrarCompra(false); setProductoCompra(null); }} />
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-info py-2 mb-3">
                  <strong>{productoCompra.descripcion}</strong>
                  <div className="small text-muted">
                    Inventario actual: <strong>{productoCompra.cantidad ?? 0}</strong> unidades
                    {productoCompra.proveedor && <> · Proveedor: <strong>{productoCompra.proveedor}</strong></>}
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">Cantidad a comprar *</label>
                    <input
                      type="number" className="form-control form-control-lg text-center"
                      placeholder="0" min="1"
                      value={cantidadCompra}
                      onChange={e => setCantidadCompra(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">Costo unitario *</label>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text">$</span>
                      <input
                        type="number" className="form-control" placeholder="0.00"
                        step="0.01" min="0"
                        value={costoCompra}
                        onChange={e => setCostoCompra(e.target.value)}
                      />
                    </div>
                  </div>
                  {cantidadCompra > 0 && costoCompra > 0 && (
                    <div className="col-12">
                      <div className="alert alert-success py-2 mb-0 text-center">
                        <strong>Total: {formatMoney(Number(cantidadCompra) * Number(costoCompra))}</strong>
                        <div className="small">
                          Inventario quedará en: <strong>{(productoCompra.cantidad || 0) + Number(cantidadCompra)} unidades</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer border-0 pt-0 gap-2">
                <button
                  className="btn btn-outline-secondary btn-lg flex-fill"
                  onClick={() => { setMostrarCompra(false); setProductoCompra(null); }}
                  disabled={comprarMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary btn-lg flex-fill fw-bold"
                  onClick={handleRegistrarCompra}
                  disabled={comprarMutation.isPending || !cantidadCompra || !costoCompra}
                >
                  {comprarMutation.isPending
                    ? <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
                    : <><i className="bi bi-check-circle-fill me-2" />Registrar Compra</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
