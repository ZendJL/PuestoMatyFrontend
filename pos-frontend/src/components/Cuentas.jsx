import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Formato de dinero
const formatMoney = (value) => {
  if (!value && value !== 0) return '$0.00';
  return `$${Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const estadoInicial = {
  nombre: '',
  descripcion: '',
  saldo: '',
};

export default function Cuentas() {
  const [form, setForm] = useState(estadoInicial);
  const [guardando, setGuardando] = useState(false);

  // Gestión de abonos / selección
  const [busqueda, setBusqueda] = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');

  // Edición de cuenta seleccionada
  const [nombreEdit, setNombreEdit] = useState('');
  const [descripcionEdit, setDescripcionEdit] = useState('');
  const [mostrarEdicionCliente, setMostrarEdicionCliente] = useState(false);

  const queryClient = useQueryClient();

  // Cargar cuentas
  const { data: cuentasRaw, isLoading, error } = useQuery({
    queryKey: ['cuentas-gestion'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas');
      return res.data;
    },
  });

  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];

  const cuentasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return cuentas
      .filter((c) =>
        q
          ? String(c.id).includes(q) ||
            c.nombre?.toLowerCase().includes(q) ||
            c.descripcion?.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (b.saldo || 0) - (a.saldo || 0));
  }, [cuentas, busqueda]);

  const totalDeuda = cuentasFiltradas.reduce(
    (sum, c) => sum + (c.saldo || 0),
    0
  );

  // Cargar abonos y ventas para detalle
  const { data: abonosRaw } = useQuery({
    queryKey: ['abonos-cuentas'],
    queryFn: async () => {
      const res = await axios.get('/api/abonos');
      return res.data;
    },
  });

  const { data: ventasRaw } = useQuery({
    queryKey: ['ventas-cuentas'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas');
      return res.data;
    },
  });

  const abonos = Array.isArray(abonosRaw) ? abonosRaw : [];
  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

  const abonosDeCuenta = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return abonos
      .filter((a) => a.cuentaId === cuentaSeleccionada.id)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [abonos, cuentaSeleccionada]);

  const ventasDeCuenta = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return ventas
      .filter((v) => (v.cuenta?.id ?? v.cuentaId) === cuentaSeleccionada.id)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [ventas, cuentaSeleccionada]);

  // Alta de cuenta
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombre) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    try {
      setGuardando(true);

      const cuenta = {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        saldo: form.saldo === '' ? 0 : parseFloat(form.saldo),
      };

      await axios.post('/api/cuentas', cuenta);

      alert('✅ Cuenta de cliente guardada correctamente');
      setForm(estadoInicial);

      queryClient.invalidateQueries({ queryKey: ['cuentas-gestion'] });
      queryClient.invalidateQueries({ queryKey: ['cuentas-reporte-deudas'] });
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar la cuenta');
    } finally {
      setGuardando(false);
    }
  };

  // Abonos
  const realizarAbono = async () => {
    if (!cuentaSeleccionada) {
      alert('Selecciona una cuenta primero');
      return;
    }
    const monto = Number(montoAbono);
    if (Number.isNaN(monto) || monto <= 0) {
      alert('El monto a abonar debe ser mayor a 0');
      return;
    }
    if (monto > (cuentaSeleccionada.saldo || 0)) {
      if (
        !window.confirm(
          'El abono es mayor que la deuda actual. ¿Deseas dejar la cuenta en saldo 0?'
        )
      ) {
        return;
      }
    }

    try {
      const res = await axios.post(
        `/api/cuentas/${cuentaSeleccionada.id}/abonar`,
        null,
        { params: { monto } }
      );

      alert(
        `✅ Abono de ${formatMoney(monto)} registrado. Nuevo saldo: ${formatMoney(
          res.data.saldo || 0
        )}`
      );

      setCuentaSeleccionada(res.data);
      setMontoAbono('');

      await queryClient.invalidateQueries({ queryKey: ['cuentas-gestion'] });
      await queryClient.invalidateQueries({
        queryKey: ['cuentas-reporte-deudas'],
      });
      await queryClient.invalidateQueries({ queryKey: ['abonos-cuentas'] });
    } catch (e) {
      console.error(e);
      alert('❌ Error al registrar abono');
    }
  };

  // Guardar cambios de nombre / descripción
  const guardarCambiosCuenta = async () => {
    if (!cuentaSeleccionada) {
      alert('Selecciona una cuenta primero');
      return;
    }

    const body = {
      ...cuentaSeleccionada,
      nombre: nombreEdit.trim() || cuentaSeleccionada.nombre,
      descripcion: descripcionEdit || null,
    };

    try {
      const res = await axios.put(
        `/api/cuentas/${cuentaSeleccionada.id}`,
        body
      );
      alert('✅ Cuenta actualizada correctamente');
      setCuentaSeleccionada(res.data);
      await queryClient.invalidateQueries({ queryKey: ['cuentas-gestion'] });
      await queryClient.invalidateQueries({
        queryKey: ['cuentas-reporte-deudas'],
      });
    } catch (err) {
      console.error(err);
      alert('❌ Error al actualizar la cuenta');
    }
  };

  const limpiarSeleccion = () => {
    setCuentaSeleccionada(null);
    setNombreEdit('');
    setDescripcionEdit('');
    setMontoAbono('');
  };

  if (isLoading) return <div>Cargando cuentas...</div>;
  if (error) return <div className="text-danger">Error al cargar cuentas</div>;

  const cuentasConDeuda = cuentas.filter((c) => (c.saldo || 0) > 0).length;

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)', // 50px por lado
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Encabezado general azul */}
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Cuentas de clientes</h5>
            <small className="text-white-100">
              Administra cuentas por cobrar y registra abonos
            </small>
          </div>
          <div className="text-end big">
            <div>
              Cuentas: <strong>{cuentas.length}</strong>
            </div>
            <div>
              Con deuda:{' '}
              <strong className="text-warning">{cuentasConDeuda}</strong>
            </div>
            <div className="text-warning">
              Total adeudado:{' '}
              <strong>{formatMoney(totalDeuda)}</strong>
            </div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            {/* Alta de cuenta */}
            <div className="col-lg-5 border-end">
              <h6 className="mb-2">Nueva cuenta de cliente</h6>
              <form onSubmit={handleSubmit} className="row g-3">
                <div className="col-12">
                  <label className="form-label mb-1">Nombre del cliente</label>
                  <input
                    type="text"
                    name="nombre"
                    className="form-control form-control-sm"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label mb-1">
                    Saldo inicial (fiado)
                  </label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      name="saldo"
                      className="form-control"
                      step="0.01"
                      min="0"
                      value={form.saldo}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-text">
                    Usualmente 0; aumentará cuando vendas a crédito.
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label mb-1">Notas</label>
                  <textarea
                    name="descripcion"
                    className="form-control form-control-sm"
                    rows={2}
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Ej. Cliente frecuente, paga cada quincena..."
                  />
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setForm(estadoInicial)}
                    disabled={guardando}
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-success"
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando...' : 'Guardar cuenta'}
                  </button>
                </div>
              </form>
            </div>

            {/* Listado, edición, abonos y detalle */}
            <div className="col-lg-7">
              {/* Lista de cuentas */}
              <div className="card shadow-sm mb-3">
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
                  <h6 className="mb-0">Cuentas y saldos</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={limpiarSeleccion}
                    disabled={!cuentaSeleccionada}
                  >
                    Quitar selección
                  </button>
                </div>
                <div className="card-body py-2">
                  <div className="row g-2 align-items-end mb-2">
                    <div className="col-md-7">
                      <label className="form-label mb-1">Buscar cuenta</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="ID, nombre o descripción..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                      />
                    </div>
                    <div className="col small text-body-secondary">
                      {cuentasFiltradas.length} cuentas listadas · Deuda en
                      vista:{' '}
                      <span className="fw-semibold text-danger">
                        {formatMoney(totalDeuda)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="border rounded small bg-body"
                    style={{ maxHeight: 210, overflowY: 'auto' }}
                  >
                    <table className="table table-sm table-hover mb-0 align-middle">
                      <thead className="sticky-top">
                        <tr>
                          <th style={{ width: 60 }}>ID</th>
                          <th>Cliente</th>
                          <th className="text-end" style={{ width: 110 }}>
                            Saldo
                          </th>
                          <th>Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuentasFiltradas.map((c) => (
                          <tr
                            key={c.id}
                            style={{ cursor: 'pointer' }}
                            className={
                              cuentaSeleccionada?.id === c.id
                                ? 'table-primary'
                                : ''
                            }
                            onClick={() => {
                              setCuentaSeleccionada(c);
                              setNombreEdit(c.nombre || '');
                              setDescripcionEdit(c.descripcion || '');
                            }}
                          >
                            <td className="small text-body-primary">
                              {c.id}
                            </td>
                            <td className="small">
                              <div className="fw-semibold">{c.nombre}</div>
                            </td>
                            <td className="text-end">
                              <span
                                className={
                                  (c.saldo || 0) > 0
                                    ? 'badge bg-danger-subtle text-danger fw-semibold'
                                    : 'badge bg-success-subtle text-success'
                                }
                              >
                                {formatMoney(c.saldo || 0)}
                              </span>
                            </td>
                            <td
                              className="small text-truncate"
                              style={{ maxWidth: 220 }}
                            >
                              {c.descripcion}
                            </td>
                          </tr>
                        ))}

                        {cuentasFiltradas.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-body-secondary py-3"
                            >
                              No hay cuentas que coincidan con la búsqueda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* Toggle de edición de datos del cliente */}
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="toggleEdicionCliente"
                  checked={mostrarEdicionCliente}
                  onChange={(e) => setMostrarEdicionCliente(e.target.checked)}
                />
                <label
                  className="form-check-label small"
                  htmlFor="toggleEdicionCliente"
                >
                  Editar datos del cliente
                </label>
              </div>

              {/* Panel de edición de datos del cliente */}
              {mostrarEdicionCliente && (
                <div className="card shadow-sm mb-3">
                  
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
                    <h6 className="mb-0">Editar datos del cliente</h6>
                  </div>
                  <div className="card-body py-2">
                    {cuentaSeleccionada ? (
                      <>
                        <div className="mb-2">
                          <label className="form-label mb-1">Nombre</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={nombreEdit}
                            onChange={(e) => setNombreEdit(e.target.value)}
                          />
                        </div>
                        <div className="mb-2">
                          <label className="form-label mb-1">
                            Descripción / notas
                          </label>
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            value={descripcionEdit}
                            onChange={(e) =>
                              setDescripcionEdit(e.target.value)
                            }
                          />
                        </div>
                        <div className="d-flex justify-content-between">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={limpiarSeleccion}
                          >
                            Cancelar / quitar selección
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            onClick={guardarCambiosCuenta}
                          >
                            Guardar cambios
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="small text-body-secondary">
                        Selecciona una cuenta de la tabla para editar nombre y
                        notas.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Panel de abono */}
              <div className="card shadow-sm mb-3">
                
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
                  <h6 className="mb-0">Registrar abono</h6>
                </div>
                <div className="card-body py-2">
                  {cuentaSeleccionada ? (
                    <>
                      <div className="small mb-2">
                        <div>
                          <strong>Cuenta:</strong> {cuentaSeleccionada.nombre}{' '}
                          (ID {cuentaSeleccionada.id})
                        </div>
                        <div>
                          <strong>Saldo actual:</strong>{' '}
                          <span className="text-danger fw-semibold">
                            {formatMoney(cuentaSeleccionada.saldo || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="row g-2 align-items-end">
                        <div className="col-md-5">
                          <label className="form-label mb-1">
                            Monto a abonar
                          </label>
                          <div className="input-group input-group-sm">
                            <span className="input-group-text">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control"
                              value={montoAbono}
                              onChange={(e) => setMontoAbono(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-md-4 small">
                          <div className="mb-1">
                            <strong>Saldo después del abono:</strong>{' '}
                            {montoAbono
                              ? (() => {
                                  const saldo = Number(
                                    cuentaSeleccionada.saldo || 0
                                  );
                                  const m = Number(montoAbono) || 0;
                                  const nuevo = Math.max(saldo - m, 0);
                                  return formatMoney(nuevo);
                                })()
                              : '—'}
                          </div>
                        </div>
                        <div className="col-md-3 d-flex justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={realizarAbono}
                          >
                            Registrar abono
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="small text-body-secondary">
                      Selecciona una cuenta de la tabla para registrar un abono.
                    </div>
                  )}
                </div>
              </div>

              {/* Historial de cuenta seleccionada */}
              <div className="card shadow-sm">
                
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
                  <h6 className="mb-0">Historial de movimientos</h6>
                </div>
                <div className="card-body py-2">
                  {!cuentaSeleccionada && (
                    <div className="small text-body-secondary">
                      Selecciona una cuenta para ver sus abonos y ventas a
                      crédito.
                    </div>
                  )}

                  {cuentaSeleccionada && (
                    <>
                      <div className="small mb-2">
                        <strong>Cuenta:</strong> {cuentaSeleccionada.nombre} (ID{' '}
                        {cuentaSeleccionada.id}) ·{' '}
                        <strong>Saldo actual:</strong>{' '}
                        <span className="text-danger fw-semibold">
                          {formatMoney(cuentaSeleccionada.saldo || 0)}
                        </span>
                      </div>

                      {/* Abonos */}
                      <div className="mb-2">
                        <h6 className="small fw-bold">Abonos</h6>
                        <div
                          className="border rounded bg-body"
                          style={{ maxHeight: 130, overflowY: 'auto' }}
                        >
                          <table className="table table-sm mb-0">
                            <thead className="sticky-top">
                              <tr>
                                <th style={{ width: 160 }}>Fecha</th>
                                <th className="text-end" style={{ width: 90 }}>
                                  Cantidad
                                </th>
                                <th className="text-end" style={{ width: 90 }}>
                                  Viejo
                                </th>
                                <th className="text-end" style={{ width: 90 }}>
                                  Nuevo
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {abonosDeCuenta.map((a) => (
                                <tr key={a.id}>
                                  <td className="small">
                                    {a.fecha
                                      ?.replace('T', ' ')
                                      .substring(0, 19)}
                                  </td>
                                  <td className="text-end text-success">
                                    {formatMoney(a.cantidad || 0)}
                                  </td>
                                  <td className="text-end small">
                                    {formatMoney(a.viejoSaldo || 0)}
                                  </td>
                                  <td className="text-end small">
                                    {formatMoney(a.nuevoSaldo || 0)}
                                  </td>
                                </tr>
                              ))}

                              {abonosDeCuenta.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="text-center text-body-secondary py-2 small"
                                  >
                                    Sin abonos registrados para esta cuenta.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Ventas */}
                      <div>
                        <h6 className="small fw-bold">Ventas a crédito</h6>
                        <div
                          className="border rounded bg-body"
                          style={{ maxHeight: 130, overflowY: 'auto' }}
                        >
                          <table className="table table-sm mb-0">
                            <thead className="sticky-top">
                              <tr>
                                <th style={{ width: 70 }}>Venta</th>
                                <th style={{ width: 150 }}>Fecha</th>
                                <th
                                  className="text-end"
                                  style={{ width: 100 }}
                                >
                                  Total
                                </th>
                                <th style={{ width: 90 }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ventasDeCuenta.map((v) => (
                                <tr key={v.id}>
                                  <td>{v.id}</td>
                                  <td className="small">
                                    {v.fecha
                                      ?.replace('T', ' ')
                                      .substring(0, 19)}
                                  </td>
                                  <td className="text-end fw-semibold">
                                    {formatMoney(v.total || 0)}
                                  </td>
                                  <td className="small">{v.status}</td>
                                </tr>
                              ))}

                              {ventasDeCuenta.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="text-center text-body-secondary py-2 small"
                                  >
                                    Sin ventas asociadas a esta cuenta.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
}
