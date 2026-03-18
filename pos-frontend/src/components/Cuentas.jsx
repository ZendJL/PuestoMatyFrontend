import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../utils/format';
import DataTable from './common/DataTable';
import { imprimirRecibo } from './ReciboAbono';
import { useTasaCambio } from '../context/TasaCambioContext';

const ETIQUETA_PAGO = {
  PESOS:   { label: '🇲🇽 Pesos',   color: 'primary' },
  DOLARES: { label: '🇺🇸 Dólares', color: 'success' },
  TARJETA: { label: '💳 Tarjeta',  color: 'info' },
};

export default function Cuentas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentaExpandida, setCuentaExpandida] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [pageSize] = useState(20);
  const [soloDeudores, setSoloDeudores] = useState(false);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', descripcion: '' });
  const [clienteEditando, setClienteEditando] = useState({ nombre: '', descripcion: '' });
  const { tasaCambio } = useTasaCambio();
  const [modoPagoAbono, setModoPagoAbono] = useState('PESOS');
  const [abonoEnDolares, setAbonoEnDolares] = useState('');
  const queryClient = useQueryClient();

  const nuevaCuentaMutation = useMutation({
    mutationFn: (cliente) => axios.post('/api/cuentas', cliente),
    onSuccess: () => {
      alert('✅ Nuevo cliente creado correctamente');
      setMostrarNuevoCliente(false);
      setNuevoCliente({ nombre: '', descripcion: '' });
      queryClient.invalidateQueries({ queryKey: ['cuentas-resumen'] });
    },
    onError: (e) => alert('❌ Error al crear cliente: ' + (e.response?.data?.message || e.message)),
  });

  const editarCuentaMutation = useMutation({
    mutationFn: ({ id, cliente }) => axios.put(`/api/cuentas/${id}`, cliente),
    onSuccess: (_, variables) => {
      alert('✅ Cliente actualizado correctamente');
      setEditandoCliente(null);
      setClienteEditando({ nombre: '', descripcion: '' });
      queryClient.invalidateQueries({ queryKey: ['cuentas-resumen'] });
      if (cuentaExpandida?.id === variables.id)
        queryClient.invalidateQueries({ queryKey: ['cuenta-detalle', variables.id] });
    },
    onError: (e) => alert('❌ Error al actualizar: ' + (e.response?.data?.message || e.message)),
  });

  const { data: cuentasResumen = [], isLoading, error } = useQuery({
    queryKey: ['cuentas-resumen'],
    queryFn: async () => {
      const r = await axios.get('/api/cuentas/resumen');
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  const { data: detalleCuenta, isLoading: loadingDetalle } = useQuery({
    queryKey: ['cuenta-detalle', cuentaExpandida?.id],
    enabled: !!cuentaExpandida?.id,
    queryFn: async () => {
      const r = await axios.get(`/api/cuentas/${cuentaExpandida.id}/detalles`);
      const d = r.data || {};
      return {
        ...d,
        ultimosAbonos: Array.isArray(d.ultimosAbonos) ? d.ultimosAbonos : [],
        ultimasVentas: Array.isArray(d.ultimasVentas) ? d.ultimasVentas : [],
      };
    },
  });

  const { data: detalleVenta, isLoading: loadingVenta } = useQuery({
    queryKey: ['venta-detalle', ventaSeleccionada?.ventaId],
    enabled: !!ventaSeleccionada?.ventaId,
    queryFn: async () => {
      const r = await axios.get(`/api/ventas/${ventaSeleccionada.ventaId}/productos`);
      return Array.isArray(r.data) ? r.data : [];
    },
  });

  const abonoMutation = useMutation({
    mutationFn: (monto) =>
      axios.post(`/api/cuentas/${cuentaExpandida.id}/abonar?monto=${monto}&tipoPago=${modoPagoAbono}`),
    onSuccess: (res) => {
      const abonoCreado = res.data;
      queryClient.invalidateQueries({ queryKey: ['cuentas-resumen'] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-detalle', cuentaExpandida?.id] });
      setMontoAbono('');
      setAbonoEnDolares('');
      if (window.confirm('✅ Abono registrado.\n\n¿Desea imprimir el recibo?'))
        imprimirRecibo(abonoCreado, cuentaExpandida, modoPagoAbono);
    },
    onError: (e) => alert('❌ Error: ' + (e.response?.data?.message || e.message)),
  });

  const datosFiltrados = useMemo(() => {
    let f = Array.isArray(cuentasResumen) ? cuentasResumen : [];
    if (soloDeudores) f = f.filter(c => (c?.saldo || 0) > 0);
    const t = busqueda.toLowerCase().trim();
    if (t) f = f.filter(c => (c?.nombre || '').toLowerCase().includes(t) || (c?.descripcion || '').toLowerCase().includes(t));
    return f;
  }, [cuentasResumen, busqueda, soloDeudores]);

  const totals = useMemo(() => ({
    clientes: datosFiltrados.length,
    saldoTotal: datosFiltrados.reduce((s, c) => s + (c?.saldo || 0), 0),
  }), [datosFiltrados]);

  const handleAbono = () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) return alert('Monto inválido');
    if (modoPagoAbono !== 'TARJETA' && monto > (cuentaExpandida?.saldo || 0))
      return alert('Monto supera el saldo');
    abonoMutation.mutate(monto);
  };

  const handleCrearCliente = () => {
    if (!nuevoCliente.nombre.trim()) { alert('El nombre es obligatorio'); return; }
    nuevaCuentaMutation.mutate({ nombre: nuevoCliente.nombre.trim(), descripcion: nuevoCliente.descripcion.trim() || null, saldo: 0 });
  };

  const handleEditarCliente = (c) => {
    setClienteEditando({ nombre: c.nombre || '', descripcion: c.descripcion || '' });
    setEditandoCliente(c.id);
  };

  const handleGuardarEdicion = () => {
    if (!clienteEditando.nombre.trim()) { alert('El nombre es obligatorio'); return; }
    const orig = cuentasResumen.find(c => c?.id === editandoCliente);
    editarCuentaMutation.mutate({ id: editandoCliente, cliente: { nombre: clienteEditando.nombre.trim(), descripcion: clienteEditando.descripcion.trim() || null, saldo: orig?.saldo || 0 } });
  };

  const productosTabla = useMemo(() => {
    if (!Array.isArray(detalleVenta)) return [];
    return detalleVenta.map(item => ({
      id: item?.id || 0,
      nombre: item?.producto?.descripcion || 'N/A',
      codigo: item?.producto?.codigo || '',
      cantidad: item?.cantidad || 0,
      precioUnitario: item?.precioUnitario || 0,
      subtotal: item?.costoTotal || ((item?.cantidad || 0) * (item?.precioUnitario || 0)),
    }));
  }, [detalleVenta]);

  if (isLoading) return <div className="text-center py-5 fs-5">Cargando...</div>;
  if (error) return <div className="text-danger text-center py-5">Error: {error.message}</div>;

  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="bg-primary text-white px-3 py-2 d-flex justify-content-between align-items-center flex-shrink-0" style={{ minHeight: 54 }}>
        <div>
          <h5 className="mb-0 fw-bold">💰 Cuentas por Cobrar</h5>
          <small className="opacity-75">{totals.clientes} clientes · Saldo total: {formatMoney(totals.saldoTotal)}</small>
        </div>
        <button className="btn btn-success fw-bold px-3" onClick={() => setMostrarNuevoCliente(v => !v)}>
          <i className="bi bi-person-plus-fill me-2" />{mostrarNuevoCliente ? 'Cancelar' : 'Nuevo Cliente'}
        </button>
      </div>

      {/* ── FORM NUEVO CLIENTE ──────────────────────────────────────*/}
      {mostrarNuevoCliente && (
        <div className="bg-success-subtle border-bottom px-3 py-3 flex-shrink-0">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-bold">Nombre del cliente *</label>
              <input type="text" className="form-control form-control-lg" placeholder="Ej: Juan Pérez"
                value={nuevoCliente.nombre} autoFocus
                onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} />
            </div>
            <div className="col-md-5">
              <label className="form-label fw-bold">Teléfono / Notas</label>
              <input type="text" className="form-control form-control-lg" placeholder="Opcional"
                value={nuevoCliente.descripcion}
                onChange={e => setNuevoCliente({ ...nuevoCliente, descripcion: e.target.value })} />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-success btn-lg fw-bold flex-fill" onClick={handleCrearCliente}
                disabled={nuevaCuentaMutation.isPending || !nuevoCliente.nombre.trim()}>
                {nuevaCuentaMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-check-circle-fill me-1" />Crear</>}
              </button>
              <button className="btn btn-outline-secondary btn-lg" onClick={() => { setMostrarNuevoCliente(false); setNuevoCliente({ nombre: '', descripcion: '' }); }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BARRA FILTROS ────────────────────────────────────────── */}
      <div className="bg-body-tertiary border-bottom px-3 py-2 d-flex gap-3 align-items-center flex-shrink-0 flex-wrap">
        <div style={{ flex: '1 1 260px', maxWidth: 360 }}>
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input type="text" className="form-control form-control-lg" placeholder="Buscar cliente..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            {busqueda && <button className="btn btn-outline-secondary" onClick={() => setBusqueda('')}><i className="bi bi-x" /></button>}
          </div>
        </div>
        <button className={`btn btn-lg fw-semibold ${soloDeudores ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setSoloDeudores(v => !v)}>
          <i className={`bi ${soloDeudores ? 'bi-people-fill' : 'bi-exclamation-triangle-fill'} me-2`} />
          {soloDeudores ? 'Ver todos' : 'Solo deudores'}
        </button>
        <div className="d-flex gap-3 ms-auto">
          <div className="border rounded px-3 py-1 text-center bg-body">
            <div className="small text-muted">Clientes</div>
            <div className="fs-5 fw-bold text-primary">{totals.clientes}</div>
          </div>
          <div className="border rounded px-3 py-1 text-center bg-body">
            <div className="small text-muted">Saldo total</div>
            <div className={`fs-5 fw-bold ${totals.saldoTotal > 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(totals.saldoTotal)}</div>
          </div>
        </div>
      </div>

      {/* ── CUERPO 2 COLUMNAS ────────────────────────────────────── */}
      <div className="flex-fill d-flex overflow-hidden">

        {/* COLUMNA IZQUIERDA: tabla de clientes */}
        <div className="d-flex flex-column border-end" style={{ width: cuentaExpandida ? '42%' : '100%', minWidth: 320, transition: 'width 0.2s' }}>
          {datosFiltrados.length === 0 ? (
            <div className="text-center text-muted p-5">
              <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50" />
              <h5>{soloDeudores ? 'Todos los clientes están al corriente' : 'No hay clientes registrados'}</h5>
            </div>
          ) : (
            <div className="overflow-auto flex-fill">
              <DataTable
                columns={[
                  {
                    id: 'nombre', header: 'Cliente', sortable: true, filterable: true,
                    render: (c) => editandoCliente === c?.id ? (
                      <div className="d-flex flex-column gap-1" onClick={e => e.stopPropagation()}>
                        <input type="text" className="form-control form-control-sm" placeholder="Nombre *"
                          value={clienteEditando.nombre} autoFocus
                          onChange={e => setClienteEditando({ ...clienteEditando, nombre: e.target.value })} />
                        <input type="text" className="form-control form-control-sm" placeholder="Descripción"
                          value={clienteEditando.descripcion}
                          onChange={e => setClienteEditando({ ...clienteEditando, descripcion: e.target.value })} />
                        <div className="d-flex gap-1 mt-1">
                          <button className="btn btn-success btn-sm flex-fill" onClick={e => { e.stopPropagation(); handleGuardarEdicion(); }}
                            disabled={editarCuentaMutation.isPending || !clienteEditando.nombre.trim()}>
                            {editarCuentaMutation.isPending ? <span className="spinner-border spinner-border-sm" /> : '✔ Guardar'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setEditandoCliente(null); }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="fw-semibold">{c?.nombre || 'Sin nombre'}</div>
                        {c?.descripcion && <small className="text-muted">{c.descripcion}</small>}
                      </div>
                    ),
                  },
                  { id: 'totalVentas', header: 'Ventas', style: { width: 70 }, align: 'center', sortable: true, render: c => c?.totalVentas || 0 },
                  { id: 'totalFacturado', header: 'Vendido', style: { width: 110 }, align: 'right', sortable: true,
                    render: c => <span className="fw-semibold text-success">{formatMoney(c?.totalFacturado || 0)}</span> },
                  { id: 'totalPagado', header: 'Pagado', style: { width: 110 }, align: 'right', sortable: true,
                    render: c => <span className="fw-semibold text-primary">{formatMoney(c?.totalPagado || 0)}</span> },
                  { id: 'saldo', header: 'Saldo', style: { width: 110 }, align: 'right', sortable: true,
                    render: c => <span className={`fw-bold fs-6 ${(c?.saldo || 0) > 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(c?.saldo || 0)}</span> },
                  {
                    id: 'acciones', header: '', style: { width: 80 }, align: 'center',
                    render: c => editandoCliente !== c?.id ? (
                      <button className="btn btn-outline-primary btn-sm" onClick={e => { e.stopPropagation(); handleEditarCliente(c); }}>
                        <i className="bi bi-pencil" />
                      </button>
                    ) : null,
                  },
                ]}
                data={datosFiltrados}
                initialSort={{ id: 'saldo', direction: 'desc' }}
                pageSize={pageSize}
                getRowKey={c => c?.id || 0}
                onRowClick={c => { if (editandoCliente !== c?.id) setCuentaExpandida(cuentaExpandida?.id === c?.id ? null : c); }}
                selectedRowKey={cuentaExpandida?.id}
              />
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: detalle del cliente */}
        {cuentaExpandida && (
          <div className="d-flex flex-column flex-fill overflow-hidden bg-body">

            {/* Header detalle */}
            <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center bg-body-tertiary flex-shrink-0">
              <div>
                <h5 className="mb-0 fw-bold">👤 {cuentaExpandida.nombre}</h5>
                <span className={`badge fs-6 ${(cuentaExpandida.saldo || 0) > 0 ? 'bg-danger' : 'bg-success'}`}>
                  {formatMoney(cuentaExpandida.saldo || 0)}
                </span>
              </div>
              <button className="btn btn-outline-secondary" onClick={() => { setCuentaExpandida(null); setVentaSeleccionada(null); }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="overflow-auto flex-fill p-3">
              {loadingDetalle ? (
                <div className="text-center py-4"><span className="spinner-border" /></div>
              ) : detalleCuenta ? (
                <>
                  {/* ABONO */}
                  {(cuentaExpandida.saldo || 0) > 0 && (
                    <div className="card mb-3 border-warning">
                      <div className="card-header bg-warning bg-opacity-25 fw-bold">
                        <i className="bi bi-cash-coin me-2" />Registrar Abono
                      </div>
                      <div className="card-body">
                        <div className="btn-group w-100 mb-3">
                          {Object.entries(ETIQUETA_PAGO).map(([key, { label, color }]) => (
                            <button key={key} type="button"
                              className={`btn btn-lg ${modoPagoAbono === key ? `btn-${color}` : `btn-outline-${color}`}`}
                              onClick={() => { setModoPagoAbono(key); setMontoAbono(''); setAbonoEnDolares(''); }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        <small className="text-muted d-block mb-2">Tasa: $1 USD = ${tasaCambio} MXN &nbsp;|&nbsp; Saldo: <strong>{formatMoney(cuentaExpandida.saldo)}</strong></small>
                        <div className="row g-2 align-items-end">
                          <div className="col-md-7">
                            {modoPagoAbono === 'DOLARES' ? (
                              <div className="input-group input-group-lg">
                                <span className="input-group-text bg-success text-white fw-bold">USD $</span>
                                <input type="number" className="form-control" placeholder="0.00" step="0.01" min="0.01"
                                  value={abonoEnDolares}
                                  onChange={e => { setAbonoEnDolares(e.target.value); setMontoAbono(String((Number(e.target.value) * tasaCambio).toFixed(2))); }} />
                              </div>
                            ) : (
                              <div className="input-group input-group-lg">
                                <span className="input-group-text fw-bold">MXN $</span>
                                <input type="number" className="form-control" placeholder="0.00" step="0.01" min="0.01"
                                  max={modoPagoAbono !== 'TARJETA' ? (cuentaExpandida.saldo || 0) : undefined}
                                  value={montoAbono} onChange={e => setMontoAbono(e.target.value)} />
                              </div>
                            )}
                            {modoPagoAbono === 'DOLARES' && abonoEnDolares > 0 && (
                              <small className="text-success fw-bold">= {formatMoney(Number(abonoEnDolares) * tasaCambio)} MXN</small>
                            )}
                          </div>
                          <div className="col-md-5">
                            <button className="btn btn-warning btn-lg w-100 fw-bold"
                              onClick={handleAbono} disabled={!montoAbono || abonoMutation.isPending}>
                              {abonoMutation.isPending
                                ? <><span className="spinner-border spinner-border-sm me-2" />Registrando...</>
                                : <><i className="bi bi-check-circle-fill me-2" />Registrar Abono</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABONOS */}
                  {detalleCuenta.ultimosAbonos.length > 0 && (
                    <div className="card mb-3">
                      <div className="card-header fw-bold"><i className="bi bi-receipt me-2" />Abonos <span className="badge bg-info ms-1">{detalleCuenta.ultimosAbonos.length}</span></div>
                      <div className="card-body p-0" style={{ maxHeight: 220, overflowY: 'auto' }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="table-light sticky-top">
                            <tr><th>Monto</th><th>Antes</th><th>Después</th><th>Tipo</th><th>Fecha</th><th style={{width:50}}></th></tr>
                          </thead>
                          <tbody>
                            {detalleCuenta.ultimosAbonos.map(a => {
                              const tp = a?.tipoPago || 'PESOS';
                              const meta = ETIQUETA_PAGO[tp] || { label: tp, color: 'secondary' };
                              return (
                                <tr key={a?.id}>
                                  <td className="fw-bold text-success">{formatMoney(a?.cantidad || 0)}</td>
                                  <td>{formatMoney(a?.viejoSaldo || 0)}</td>
                                  <td className="fw-bold text-primary">{formatMoney(a?.nuevoSaldo || 0)}</td>
                                  <td><span className={`badge bg-${meta.color}-subtle text-${meta.color}-emphasis border border-${meta.color}-subtle`}>{meta.label}</span></td>
                                  <td><small className="text-muted">{formatFecha(a?.fecha)}</small></td>
                                  <td><button className="btn btn-sm btn-outline-secondary" onClick={() => imprimirRecibo(a, cuentaExpandida, tp)} title="Recibo"><i className="bi bi-printer" /></button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* VENTAS */}
                  {detalleCuenta.ultimasVentas.length > 0 && (
                    <div className="card">
                      <div className="card-header fw-bold"><i className="bi bi-cart me-2" />Ventas <span className="badge bg-primary ms-1">{detalleCuenta.ultimasVentas.length}</span></div>
                      <div className="card-body p-0" style={{ maxHeight: 260, overflowY: 'auto' }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="table-light sticky-top">
                            <tr><th>#</th><th className="text-end">Total</th><th>Estado</th><th>Tipo pago</th><th>Fecha</th></tr>
                          </thead>
                          <tbody>
                            {detalleCuenta.ultimasVentas.map(v => {
                              const tp = v?.tipoPago;
                              const meta = tp ? (ETIQUETA_PAGO[tp] || { label: tp, color: 'secondary' }) : null;
                              return (
                                <tr key={v?.id} style={{ cursor: 'pointer' }}
                                  className={ventaSeleccionada?.id === v?.id ? 'table-active' : ''}
                                  onClick={() => setVentaSeleccionada(ventaSeleccionada?.id === v?.id ? null : v)}>
                                  <td className="fw-semibold">#{v?.ventaId || 'N/A'}</td>
                                  <td className="text-end fw-bold text-success">{formatMoney(v?.totalVenta || 0)}</td>
                                  <td><span className={`badge ${v?.status === 'COMPLETADA' ? 'bg-success' : v?.status === 'PRESTAMO' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{v?.status === 'PRESTAMO' ? 'Préstamo' : v?.status === 'COMPLETADA' ? 'Contado' : v?.status}</span></td>
                                  <td>{meta ? <span className={`badge bg-${meta.color}-subtle text-${meta.color}-emphasis border border-${meta.color}-subtle`}>{meta.label}</span> : <span className="text-muted">—</span>}</td>
                                  <td><small className="text-muted">{formatFecha(v?.fecha)}</small></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Detalle productos de la venta */}
                      {ventaSeleccionada && (
                        <div className="card-footer p-0">
                          <div className="bg-body-tertiary px-3 py-2 d-flex justify-content-between align-items-center">
                            <span className="fw-bold">📦 Productos de venta #{ventaSeleccionada.ventaId} — {formatMoney(ventaSeleccionada.totalVenta || 0)}</span>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setVentaSeleccionada(null)}><i className="bi bi-x" /></button>
                          </div>
                          {loadingVenta ? (
                            <div className="text-center py-3"><span className="spinner-border spinner-border-sm" /></div>
                          ) : (
                            <table className="table table-sm table-striped mb-0">
                              <thead className="table-light">
                                <tr><th>Producto</th><th className="text-center">Cant.</th><th className="text-end">P/U</th><th className="text-end">Subtotal</th></tr>
                              </thead>
                              <tbody>
                                {productosTabla.map(p => (
                                  <tr key={p.id}>
                                    <td>{p.nombre}<div className="small text-muted">{p.codigo}</div></td>
                                    <td className="text-center fw-bold">{p.cantidad}</td>
                                    <td className="text-end">{formatMoney(p.precioUnitario)}</td>
                                    <td className="text-end fw-bold text-success">{formatMoney(p.subtotal)}</td>
                                  </tr>
                                ))}
                                {productosTabla.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-3">Sin productos</td></tr>}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted text-center py-4">No se pudo cargar el detalle</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
