import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../utils/format';
import DataTable from './common/DataTable';
import { imprimirRecibo } from './ReciboAbono';

export default function Cuentas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentaExpandida, setCuentaExpandida] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [soloDeudores, setSoloDeudores] = useState(false);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', descripcion: '' });
  const [clienteEditando, setClienteEditando] = useState({ nombre: '', descripcion: '' });
  
  const queryClient = useQueryClient();

  // ✅ MUTACIÓN NUEVA CUENTA
  const nuevaCuentaMutation = useMutation({
    mutationFn: (cliente) => axios.post('/api/cuentas', cliente),
    onSuccess: () => {
      alert('✅ Nuevo cliente creado correctamente');
      setMostrarNuevoCliente(false);
      setNuevoCliente({ nombre: '', descripcion: '' });
      queryClient.invalidateQueries({ queryKey: ['cuentas-resumen'] });
    },
    onError: (error) => {
      alert('❌ Error al crear cliente: ' + (error.response?.data?.message || error.message));
    },
  });

  // ✅ MUTACIÓN EDITAR CUENTA
  const editarCuentaMutation = useMutation({
    mutationFn: ({ id, cliente }) => axios.put(`/api/cuentas/${id}`, cliente),
    onSuccess: (data, variables) => {
      alert('✅ Cliente actualizado correctamente');
      setEditandoCliente(null);
      setClienteEditando({ nombre: '', descripcion: '' });
      queryClient.invalidateQueries({ queryKey: ['cuentas-resumen'] });
      if (cuentaExpandida?.id === variables.id) {
        queryClient.invalidateQueries({ queryKey: ['cuenta-detalle', variables.id] });
      }
    },
    onError: (error) => {
      alert('❌ Error al actualizar: ' + (error.response?.data?.message || error.message));
    },
  });

  // Resumen cuentas
  const { data: cuentasResumen = [], isLoading, error } = useQuery({
    queryKey: ['cuentas-resumen'],
    queryFn: async () => axios.get('/api/cuentas/resumen').then(res => res.data),
  });

  // Detalle cuenta expandida
  const { data: detalleCuenta, isLoading: loadingDetalle } = useQuery({
    queryKey: ['cuenta-detalle', cuentaExpandida?.id],
    enabled: !!cuentaExpandida?.id,
    queryFn: async () => axios.get(`/api/cuentas/${cuentaExpandida.id}/detalles`).then(res => res.data),
  });

  // DETALLE DE VENTA (productos)
  const { data: detalleVenta, isLoading: loadingVenta } = useQuery({
    queryKey: ['venta-detalle', ventaSeleccionada?.ventaId],
    enabled: !!ventaSeleccionada?.ventaId,
    queryFn: async () => {
      const res = await axios.get(`/api/ventas/${ventaSeleccionada.ventaId}/productos`);
      return res.data;
    },
  });

  // ✅ MUTACIÓN ABONO CON IMPRESIÓN
  const abonoMutation = useMutation({
    mutationFn: (monto) => axios.post(`/api/cuentas/${cuentaExpandida.id}/abonar?monto=${monto}`),
    onSuccess: (response) => {
      const abonoCreado = response.data;
      queryClient.invalidateQueries({ queryKey: ['cuentas-resumen'] });
      queryClient.invalidateQueries({ queryKey: ['cuenta-detalle', cuentaExpandida?.id] });
      setMontoAbono('');
      
      // ✅ PREGUNTAR SI IMPRIMIR
      if (window.confirm('✅ Abono registrado correctamente.\n\n¿Desea imprimir el recibo?')) {
        imprimirRecibo(abonoCreado, cuentaExpandida);
      }
    },
    onError: (error) => {
      alert('❌ Error al registrar abono: ' + (error.response?.data?.message || error.message));
    },
  });

  const datosFiltrados = useMemo(() => {
    let filtrados = cuentasResumen;

    if (soloDeudores) {
      filtrados = filtrados.filter(c => (c.saldo || 0) > 0);
    }

    const texto = busqueda.toLowerCase();
    if (texto) {
      filtrados = filtrados.filter(c => 
        c.nombre?.toLowerCase().includes(texto) || 
        c.descripcion?.toLowerCase().includes(texto)
      );
    }

    return filtrados;
  }, [cuentasResumen, busqueda, soloDeudores]);

  // KPIs SIMPLIFICADOS
  const totals = {
    clientes: datosFiltrados.length,
    saldoTotal: datosFiltrados.reduce((sum, c) => sum + (c.saldo || 0), 0),
  };

  const handleAbono = () => {
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) return alert('Monto inválido');
    abonoMutation.mutate(monto);
  };

  // HANDLER NUEVA CUENTA
  const handleCrearCliente = () => {
    if (!nuevoCliente.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    nuevaCuentaMutation.mutate({
      nombre: nuevoCliente.nombre.trim(),
      descripcion: nuevoCliente.descripcion.trim() || null,
      saldo: 0
    });
  };

  // ✅ HANDLER EDITAR CUENTA
  const handleEditarCliente = (cliente) => {
    setClienteEditando({
      nombre: cliente.nombre || '',
      descripcion: cliente.descripcion || ''
    });
    setEditandoCliente(cliente.id);
  };

  const handleGuardarEdicion = () => {
    if (!clienteEditando.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    const cuentaOriginal = cuentasResumen.find(c => c.id === editandoCliente);
    editarCuentaMutation.mutate({
      id: editandoCliente,
      cliente: {
        nombre: clienteEditando.nombre.trim(),
        descripcion: clienteEditando.descripcion.trim() || null,
        saldo: cuentaOriginal?.saldo || 0
      }
    });
  };

  const handleCancelarEdicion = () => {
    setEditandoCliente(null);
    setClienteEditando({ nombre: '', descripcion: '' });
  };

  // Transformar productos del JSON
  const productosTabla = useMemo(() => {
    if (!detalleVenta || !Array.isArray(detalleVenta)) return [];
    return detalleVenta.map(item => ({
      id: item.id,
      nombre: item.producto?.descripcion || 'N/A',
      codigo: item.producto?.codigo || '',
      cantidad: item.cantidad || 0,
      precioUnitario: item.precioUnitario || 0,
      importe: item.importe || 0,
      subtotal: item.costoTotal || (item.cantidad * item.precioUnitario) || 0
    }));
  }, [detalleVenta]);

  if (isLoading) return <div className="fs-6 text-center py-5">Cargando...</div>;
  if (error) return <div className="text-danger fs-6 text-center py-5">Error: {error.message}</div>;

  return (
    <div className="d-flex justify-content-center">
      <div className="card shadow-sm fs-6 w-100" style={{ maxWidth: 'calc(100vw - 100px)', margin: '0.25rem 0' }}>
        {/* ✅ HEADER ULTRA COMPACTO Y MÁS ARRIBA */}
        <div className="card-header p-2 bg-primary text-white border-bottom-0 d-flex justify-content-between align-items-center" style={{ minHeight: '48px' }}>
          <div className="d-flex align-items-center h-100">
            <h6 className="mb-0 me-2" style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>💰 Cuentas Cobrar</h6>
            <small className="opacity-75" style={{ fontSize: '0.7rem' }}>
              {totals.clientes} | {formatMoney(totals.saldoTotal)}
              {soloDeudores && <span className="badge bg-danger ms-1" style={{ fontSize: '0.6rem' }}>Deudores</span>}
            </small>
          </div>
          <button 
            className="btn btn-success btn-sm fw-bold px-2 py-1"
            style={{ fontSize: '0.75rem' }}
            onClick={() => setMostrarNuevoCliente(true)}
          >
            <i className="bi bi-plus-circle-fill me-1"/>Nuevo Cliente
          </button>
        </div>

        {/* ✅ FORMULARIO NUEVO CLIENTE */}
        {mostrarNuevoCliente && (
          <div className="card-header bg-success-subtle border-bottom py-3">
            <div className="row g-3 align-items-end">
              <div className="col-lg-4 col-md-5">
                <label className="form-label fw-semibold mb-1 small">Nombre *</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Juan Pérez"
                  value={nuevoCliente.nombre}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="col-lg-5 col-md-4">
                <label className="form-label fw-semibold mb-1 small">Descripción</label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  placeholder="Teléfono, notas..."
                  value={nuevoCliente.descripcion}
                  onChange={(e) => setNuevoCliente({...nuevoCliente, descripcion: e.target.value})}
                />
              </div>
              <div className="col-lg-3 col-md-3">
                <div className="d-grid gap-2 h-100">
                  <button 
                    className="btn btn-success h-100 fw-bold shadow-sm"
                    onClick={handleCrearCliente}
                    disabled={nuevaCuentaMutation.isPending || !nuevoCliente.nombre.trim()}
                  >
                    {nuevaCuentaMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"/>
                        Creando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill me-1"/>Crear
                      </>
                    )}
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setMostrarNuevoCliente(false);
                      setNuevoCliente({ nombre: '', descripcion: '' });
                    }}
                  >
                    <i className="bi bi-x"/>Cancelar
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 small text-success">
              <i className="bi bi-info-circle me-1"/>Saldo inicial: $0.00
            </div>
          </div>
        )}

        <div className="card-body py-3">
          {/* KPIs */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="border rounded p-3">
                <div className="small text-body-secondary">Total Clientes</div>
                <div className="fs-4 fw-bold text-primary">{totals.clientes}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3">
                <div className="small text-body-secondary">Saldo Total</div>
                <div className={`fs-4 fw-bold ${totals.saldoTotal > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatMoney(totals.saldoTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="border rounded p-3 mb-4 bg-body-tertiary">
            <div className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label mb-1 small fw-semibold">🔍 Buscar</label>
                <input
                  type="text" 
                  className="form-control form-control-lg"
                  placeholder="Nombre o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label mb-1 small fw-semibold">Filas</label>
                <select 
                  className="form-select" 
                  value={pageSize} 
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button
                  className={`btn w-100 py-2 ${soloDeudores ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setSoloDeudores(!soloDeudores)}
                >
                  {soloDeudores ? (
                    <>
                      <i className="bi bi-people-fill me-1"/>Todos
                    </>
                  ) : (
                    <>
                      <i className="bi bi-exclamation-triangle-fill me-1"/>Deudores
                    </>
                  )}
                </button>
              </div>
            </div>
            {soloDeudores && (
              <div className="mt-2 p-2 bg-danger-subtle border rounded small">
                <i className="bi bi-info-circle me-1"/> {totals.clientes} deudor{totals.clientes !== 1 ? 'es' : ''}
              </div>
            )}
          </div>

          {/* ✅ TABLA CON EDICIÓN INLINE Y BOTONES VERTICALES */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header py-2 d-flex justify-content-between align-items-center">
              <h6 className="mb-0">
                <i className="bi bi-list-ul me-2"/>Resumen Cliente
                <span className="badge bg-secondary ms-2">{datosFiltrados.length}</span>
              </h6>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '400px', overflow: 'auto' }}>
              <DataTable
                columns={[
                  {
                    id: 'nombre', 
                    header: 'Cliente', 
                    sortable: true, 
                    filterable: true,
                    render: (c) => (
                      <div style={{ minHeight: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {editandoCliente === c.id ? (
                          <div className="d-flex flex-column gap-1">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              style={{ height: '24px', fontSize: '0.8rem' }}
                              placeholder="Nombre *"
                              value={clienteEditando.nombre}
                              onChange={(e) => setClienteEditando({...clienteEditando, nombre: e.target.value})}
                              autoFocus
                            />
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              style={{ height: '22px', fontSize: '0.8rem' }}
                              placeholder="Descripción"
                              value={clienteEditando.descripcion}
                              onChange={(e) => setClienteEditando({...clienteEditando, descripcion: e.target.value})}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{c.nombre}</div>
                            {c.descripcion && <small className="">{c.descripcion}</small>}
                          </>
                        )}
                      </div>
                    )
                  },
                  { id: 'totalVentas', header: 'Ventas', width: 80, align: 'center', sortable: true },
                  {
                    id: 'totalFacturado', 
                    header: 'Vendido 💵', 
                    width: 130, 
                    align: 'right', 
                    sortable: true,
                    render: (c) => <div className="fw-semibold text-success">{formatMoney(c.totalFacturado)}</div>
                  },
                  {
                    id: 'totalPagado', 
                    header: 'Pagado 💳', 
                    width: 130, 
                    align: 'right', 
                    sortable: true,
                    render: (c) => <div className="fw-semibold text-primary">{formatMoney(c.totalPagado)}</div>
                  },
                  {
                    id: 'saldo', 
                    header: 'Saldo ⚖️', 
                    width: 130, 
                    align: 'right', 
                    sortable: true,
                    render: (c) => (
                      <div className={`fw-bold fs-6 ${c.saldo > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatMoney(c.saldo)}
                      </div>
                    )
                  },
                  {
                    id: 'acciones',
                    header: 'Acciones',
                    width: 110,
                    align: 'center',
                    render: (c) => (
                      <div className="d-flex flex-column gap-1 h-100 justify-content-center p-1">
                        {editandoCliente === c.id ? (
                          <>
                            <button
                              className="btn btn-success btn-sm flex-fill py-1"
                              style={{ minHeight: '28px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGuardarEdicion();
                              }}
                              disabled={editarCuentaMutation.isPending || !clienteEditando.nombre.trim()}
                              title="Guardar cambios"
                            >
                              {editarCuentaMutation.isPending ? (
                                <span className="spinner-border spinner-border-sm me-1"/>
                              ) : (
                                <i className="bi bi-check-lg me-1"/>
                              )}
                              Guardar
                            </button>
                            <button
                              className="btn btn-secondary btn-sm flex-fill py-1"
                              style={{ minHeight: '28px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelarEdicion();
                              }}
                              title="Cancelar"
                            >
                              <i className="bi bi-x me-1"/>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-outline-primary btn-sm w-100 py-1"
                            style={{ minHeight: '32px', fontSize: '0.8rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditarCliente(c);
                            }}
                            title="Editar cliente"
                          >
                            <i className="bi bi-pencil me-1"/>
                            Editar
                          </button>
                        )}
                      </div>
                    )
                  }
                ]}
                data={datosFiltrados}
                initialSort={{ id: 'saldo', direction: 'desc' }}
                pageSize={pageSize}
                getRowKey={(c) => c.id}
                onRowClick={(c) => {
                  if (editandoCliente !== c.id) {
                    setCuentaExpandida(cuentaExpandida?.id === c.id ? null : c);
                  }
                }}
                selectedRowKey={cuentaExpandida?.id}
              />
            </div>
          </div>

          {/* Detalle Cuenta */}
          {cuentaExpandida && (
            <div className="card mt-4 shadow-sm">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6>
                  👤 {cuentaExpandida.nombre} 
                  <span className={`badge ms-2 fs-6 fw-semibold ${cuentaExpandida.saldo > 0 ? 'bg-danger' : 'bg-success'}`}>
                    {formatMoney(cuentaExpandida.saldo)}
                  </span>
                </h6>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setCuentaExpandida(null)}>
                  <i className="bi bi-x-circle"/>Cerrar
                </button>
              </div>
              
              <div className="card-body p-0">
                {loadingDetalle ? (
                  <div className="p-4 text-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status"/>
                    <span>Cargando detalles...</span>
                  </div>
                ) : detalleCuenta ? (
                  <>
                    {/* Form Abono */}
                    {cuentaExpandida.saldo > 0 && (
                      <div className="p-4 bg-warning bg-opacity-10 border-bottom">
                        <h6 className="mb-3">
                          <i className="bi bi-cash-coin text-warning me-2"/>Nuevo Abono
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-5">
                            <input
                              type="number" 
                              className="form-control form-control-lg"
                              placeholder="0.00" 
                              step="0.01" 
                              min="0.01" 
                              max={cuentaExpandida.saldo}
                              value={montoAbono} 
                              onChange={(e) => setMontoAbono(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <small className="text-muted">Máx: {formatMoney(cuentaExpandida.saldo)}</small>
                          </div>
                          <div className="col-md-3">
                            <button 
                              className="btn btn-warning w-100 h-100 py-3 fw-bold" 
                              onClick={handleAbono} 
                              disabled={!montoAbono || abonoMutation.isPending}
                            >
                              {abonoMutation.isPending ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"/>
                                  Registrando...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-check-circle-fill me-2"/>Abono
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      {/* ✅ ABONOS CON BOTÓN IMPRIMIR */}
                      {detalleCuenta.ultimosAbonos?.length > 0 ? (
                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6>
                              <i className="bi bi-receipt me-2"/>Abonos 
                              <span className="badge bg-info ms-2">{detalleCuenta.ultimosAbonos.length}</span>
                            </h6>
                          </div>
                          <div className="table-responsive" style={{maxHeight: '250px', overflow: 'auto'}}>
                            <table className="table table-sm table-hover">
                              <thead className="table-light">
                                <tr>
                                  <th>Monto</th>
                                  <th>Antes</th>
                                  <th>Después</th>
                                  <th>Fecha</th>
                                  <th width="80">🖨️</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalleCuenta.ultimosAbonos.slice(0, pageSize).map(abono => (
                                  <tr key={abono.id}>
                                    <td className="fw-bold text-success">{formatMoney(abono.cantidad)}</td>
                                    <td>{formatMoney(abono.viejoSaldo)}</td>
                                    <td className="fw-bold text-primary">{formatMoney(abono.nuevoSaldo)}</td>
                                    <td><small className="text-muted">{formatFecha(abono.fecha)}</small></td>
                                    <td>
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => imprimirRecibo(abono, cuentaExpandida)}
                                        title="Reimprimir recibo"
                                      >
                                        <i className="bi bi-printer-fill"/>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-info mb-4">
                          <i className="bi bi-info-circle me-2"/>Sin abonos
                        </div>
                      )}

                      {/* Ventas */}
                      {detalleCuenta.ultimasVentas?.length > 0 ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6>
                              <i className="bi bi-cart me-2"/>Ventas 
                              <span className="badge bg-primary ms-2">{detalleCuenta.ultimasVentas.length}</span>
                            </h6>
                          </div>
                          <div className="table-responsive" style={{maxHeight: '300px', overflow: 'auto'}}>
                            <table className="table table-sm table-hover">
                              <thead className="table-light">
                                <tr>
                                  <th>#</th>
                                  <th>Total</th>
                                  <th>Status</th>
                                  <th>Fecha</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detalleCuenta.ultimasVentas.slice(0, pageSize).map(venta => (
                                  <tr 
                                    key={venta.id} 
                                    className={ventaSeleccionada?.id === venta.id ? 'table-active' : ''}
                                    style={{cursor: 'pointer'}}
                                    onClick={() => setVentaSeleccionada(ventaSeleccionada?.id === venta.id ? null : venta)}
                                  >
                                    <td className="fw-semibold">#{venta.ventaId}</td>
                                    <td className="text-end fw-bold text-success">{formatMoney(venta.totalVenta)}</td>
                                    <td>
                                      <span className={`badge fs-6 px-2 py-1 fw-semibold ${
                                        venta.status === 'COMPLETADA' ? 'bg-success' : 
                                        venta.status === 'PRESTAMO' ? 'bg-warning text-dark' : 
                                        'bg-secondary'
                                      }`}>
                                        {venta.status}
                                      </span>
                                    </td>
                                    <td><small className="text-muted">{formatFecha(venta.fecha)}</small></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-info">
                          <i className="bi bi-info-circle me-2"/>Sin ventas
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-muted">
                    No se pudo cargar el detalle
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DETALLE PRODUCTOS */}
          {ventaSeleccionada && (
            <div className="card mt-4 shadow-sm">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6>
                  📦 Productos #{ventaSeleccionada.ventaId} 
                  <span className="badge bg-success ms-2 fs-6">{formatMoney(ventaSeleccionada.totalVenta)}</span>
                </h6>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => setVentaSeleccionada(null)}
                >
                  <i className="bi bi-x-circle"/>Cerrar
                </button>
              </div>
              <div className="card-body p-0">
                {loadingVenta ? (
                  <div className="p-4 text-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status"/>
                    Cargando productos...
                  </div>
                ) : productosTabla.length > 0 ? (
                  <div className="table-responsive" style={{maxHeight: '400px', overflow: 'auto'}}>
                    <table className="table table-sm table-hover">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th width="90">Código</th>
                          <th>Producto</th>
                          <th className="text-center" width="70">Cant.</th>
                          <th className="text-end" width="100">P/U</th>
                          <th className="text-end" width="120">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosTabla.slice(0, pageSize).map(producto => (
                          <tr key={producto.id}>
                            <td><small className="text-muted">{producto.codigo}</small></td>
                            <td className="pe-2">{producto.nombre}</td>
                            <td className="text-center fw-bold">{producto.cantidad}</td>
                            <td className="text-end small">{formatMoney(producto.precioUnitario)}</td>
                            <td className="text-end fw-bold text-success fs-6">
                              {formatMoney(producto.subtotal)}
                            </td>
                          </tr>
                        ))}
                        <tr className="table-group-divider">
                          <td colSpan={4} className="text-end fw-bold fs-5 text-primary">TOTAL:</td>
                          <td className="text-end fs-4 fw-bold text-success">
                            {formatMoney(ventaSeleccionada.totalVenta)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted">
                    No hay productos
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="card-footer bg-body-tertiary py-3 text-center text-muted small">
            <div className="row">
              <div className="col-md-6">
                Total sistema: {cuentasResumen?.length || 0}
              </div>
              <div className="col-md-6 text-md-end">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
