import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';

const INVENTARIO_BAJO_UMBRAL = 5;

export default function Proveedores() {
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
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

  // Filtro de la lista lateral (por nombre de proveedor únicamente)
  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return proveedores;
    return proveedores.filter(pv => pv.nombre.toLowerCase().includes(q));
  }, [proveedores, busqueda]);

  // Al cambiar de proveedor, limpiar buscador interno
  const seleccionarProveedor = (nombre) => {
    setProveedorSeleccionado(nombre === proveedorSeleccionado ? null : nombre);
    setBusquedaProducto('');
  };

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

  const provSelec = proveedoresFiltrados.find(p => p.nombre === proveedorSeleccionado)
    // fallback: si el proveedor seleccionado no aparece en la lista filtrada (ej. se escribió en el buscador lateral)
    || proveedores.find(p => p.nombre === proveedorSeleccionado);

  // Productos del proveedor filtrados por el buscador interno
  const productosFiltradosPanel = useMemo(() => {
    if (!provSelec) return [];
    const q = busquedaProducto.toLowerCase().trim();
    if (!q) return provSelec.productos;
    return provSelec.productos.filter(p =>
      p.descripcion?.toLowerCase().includes(q) ||
      p.codigo?.toString().toLowerCase().includes(q)
    );
  }, [provSelec, busquedaProducto]);

  if (isLoading) return <div className="text-center py-5 fs-5">Cargando proveedores...</div>;

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* HEADER */}
      <div className="bg-primary text-white px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0" style={{ minHeight: 54 }}>
        <div>
          <h5 className="mb-0 fw-bold">🏤 Proveedores</h5>
          <small className="opacity-75">{proveedores.length} proveedores · {productos.length} productos</small>
        </div>
        <div className="d-flex gap-3">
          <div className="border border-white border-opacity-50 rounded px-3 py-1 text-center">
            <div className="small opacity-75">Proveedores</div>
            <div className="fs-5 fw-bold">{proveedores.length}</div>
          </div>
          <div className="border border-white border-opacity-50 rounded px-3 py-1 text-center">
            <div className="small opacity-75">Valor total</div>
            <div className="fs-6 fw-bold">{formatMoney(proveedores.reduce((s, pv) => s + pv.valorInventario, 0))}</div>
          </div>
        </div>
      </div>

      {/* BARRA FILTRO (solo proveedores) */}
      <div className="bg-body-tertiary border-bottom px-3 py-2 flex-shrink-0">
        <div className="input-group" style={{ maxWidth: 400 }}>
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar proveedor..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="btn btn-outline-secondary" onClick={() => setBusqueda('')}>
              <i className="bi bi-x" />
            </button>
          )}
        </div>
      </div>

      {/* CUERPO 2 COLUMNAS */}
      <div className="flex-fill d-flex overflow-hidden">

        {/* COLUMNA IZQUIERDA: lista de proveedores */}
        <div
          className="d-flex flex-column border-end"
          style={{ width: provSelec ? '35%' : '100%', minWidth: 280, transition: 'width 0.2s' }}
        >
          <div className="overflow-auto flex-fill">
            {proveedoresFiltrados.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-search fs-1 d-block mb-2 opacity-50" />
                <h5>Sin resultados</h5>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {proveedoresFiltrados.map(pv => (
                  <button
                    key={pv.nombre}
                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start py-3 px-3 ${
                      proveedorSeleccionado === pv.nombre ? 'active' : ''
                    }`}
                    onClick={() => seleccionarProveedor(pv.nombre)}
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
                        <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>⚠️ Inv. bajo</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: productos del proveedor */}
        {provSelec ? (
          <div className="d-flex flex-column flex-fill overflow-hidden bg-body">

            {/* Header detalle */}
            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-body-tertiary flex-shrink-0">
              <div>
                <h5 className="mb-0 fw-bold">🏤 {provSelec.nombre}</h5>
                <div className="d-flex gap-2 mt-1">
                  <span className="badge bg-primary">{provSelec.totalProductos} productos</span>
                  <span className="badge bg-success">{formatMoney(provSelec.valorInventario)}</span>
                </div>
              </div>
              <button className="btn btn-outline-secondary" onClick={() => seleccionarProveedor(null)}>
                <i className="bi bi-x-lg" /> Cerrar
              </button>
            </div>

            {/* BUSCADOR DE PRODUCTOS DENTRO DEL PROVEEDOR */}
            <div className="px-3 py-2 border-bottom bg-body flex-shrink-0">
              <div className="input-group input-group-sm" style={{ maxWidth: 360 }}>
                <span className="input-group-text"><i className="bi bi-search" /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar producto por nombre o código..."
                  value={busquedaProducto}
                  onChange={e => setBusquedaProducto(e.target.value)}
                  autoFocus
                />
                {busquedaProducto && (
                  <button className="btn btn-outline-secondary" onClick={() => setBusquedaProducto('')}>
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
              {busquedaProducto && (
                <small className="text-muted mt-1 d-block">
                  {productosFiltradosPanel.length} de {provSelec.totalProductos} productos
                </small>
              )}
            </div>

            <div className="overflow-auto flex-fill">
              {productosFiltradosPanel.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-search fs-1 d-block mb-2 opacity-50" />
                  <div className="fs-6">Sin productos para "<strong>{busquedaProducto}</strong>"</div>
                </div>
              ) : (
                <table className="table table-hover table-sm mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Producto</th>
                      <th className="text-end" style={{ width: 90 }}>Inventario</th>
                      <th className="text-end" style={{ width: 110 }}>Costo</th>
                      <th className="text-end" style={{ width: 110 }}>Precio</th>
                      <th className="text-center" style={{ width: 120 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltradosPanel.map(p => {
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
                            <span className={`fw-bold ${
                              inventarioBajo
                                ? (p.cantidad ?? 0) === 0 ? 'text-danger' : 'text-warning'
                                : 'text-success'
                            }`}>
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
              )}
            </div>
          </div>
        ) : (
          <div className="flex-fill d-flex align-items-center justify-content-center text-muted">
            <div className="text-center">
              <i className="bi bi-building fs-1 d-block mb-3 opacity-25" />
              <h5>Selecciona un proveedor</h5>
              <p className="small">Haz clic en un proveedor para ver sus productos</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL COMPRA */}
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
