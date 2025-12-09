import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
        `✅ Abono de $${monto.toFixed(
          2
        )} registrado. Nuevo saldo: $${res.data.saldo.toFixed(2)}`
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

  if (isLoading) return <div>Cargando cuentas...</div>;
  if (error) return <div className="text-danger">Error al cargar cuentas</div>;

  return (
    <div className="row g-3">
      {/* Alta de cuenta */}
      <div className="col-md-6">
        <div className="card shadow-sm">
          <div className="card-header py-2">
            <h5 className="mb-0">Alta de cuenta de cliente</h5>
          </div>
          <div className="card-body py-3">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
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
                <label className="form-label mb-1">Saldo inicial (fiado)</label>
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
                  Normalmente 0; aumentará cuando vendas a crédito.
                </div>
              </div>

              <div className="col-12">
                <label className="form-label mb-1">Descripción / notas</label>
                <textarea
                  name="descripcion"
                  className="form-control form-control-sm"
                  rows={2}
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Ej. Cliente frecuente del negocio, vive cerca..."
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
                  className="btn btn-sm btn-primary"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : 'Guardar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Listado, abonos y detalle */}
      <div className="col-md-6">
        <div className="card shadow-sm mb-3">
          <div className="card-header py-2">
            <h5 className="mb-0">Cuentas y saldos</h5>
          </div>
          <div className="card-body py-3">
            <div className="row g-2 align-items-end mb-2">
              <div className="col-md-6">
                <label className="form-label mb-1">Buscar cuenta</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="ID, nombre o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <div className="col small text-muted">
                {cuentasFiltradas.length} cuentas · Deuda total:{' '}
                <span className="fw-semibold text-danger">
                  ${totalDeuda.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              className="border rounded"
              style={{ maxHeight: 220, overflowY: 'auto' }}
            >
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Cliente</th>
                    <th className="text-end" style={{ width: 120 }}>
                      Saldo
                    </th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentasFiltradas.map((c) => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      className={
                        cuentaSeleccionada?.id === c.id ? 'table-active' : ''
                      }
                      onClick={() => setCuentaSeleccionada(c)}
                    >
                      <td>{c.id}</td>
                      <td className="small">
                        <div className="fw-semibold">{c.nombre}</div>
                      </td>
                      <td className="text-end fw-semibold">
                        ${Number(c.saldo || 0).toFixed(2)}
                      </td>
                      <td
                        className="small text-truncate"
                        style={{ maxWidth: 200 }}
                      >
                        {c.descripcion}
                      </td>
                    </tr>
                  ))}

                  {cuentasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-3">
                        No hay cuentas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel de abono */}
        <div className="card shadow-sm mb-3">
          <div className="card-header py-2">
            <h6 className="mb-0">Registrar abono</h6>
          </div>
          <div className="card-body py-2">
            {cuentaSeleccionada ? (
              <>
                <div className="small mb-2">
                  <div>
                    <strong>Cuenta:</strong> {cuentaSeleccionada.nombre} (ID{' '}
                    {cuentaSeleccionada.id})
                  </div>
                  <div>
                    <strong>Saldo actual:</strong>{' '}
                    <span className="text-danger fw-semibold">
                      ${Number(cuentaSeleccionada.saldo || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="row g-2 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label mb-1">Monto a abonar</label>
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
                            const saldo = Number(cuentaSeleccionada.saldo || 0);
                            const m = Number(montoAbono) || 0;
                            const nuevo = Math.max(saldo - m, 0);
                            return `$${nuevo.toFixed(2)}`;
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
              <div className="small text-muted">
                Selecciona una cuenta de la tabla para registrar un abono.
              </div>
            )}
          </div>
        </div>

        {/* Historial de cuenta seleccionada */}
        <div className="card shadow-sm">
          <div className="card-header py-2">
            <h6 className="mb-0">Historial de la cuenta</h6>
          </div>
          <div className="card-body py-2">
            {!cuentaSeleccionada && (
              <div className="small text-muted">
                Selecciona una cuenta para ver sus abonos y ventas.
              </div>
            )}

            {cuentaSeleccionada && (
              <>
                <div className="small mb-2">
                  <strong>Cuenta:</strong> {cuentaSeleccionada.nombre} (ID{' '}
                  {cuentaSeleccionada.id}) · <strong>Saldo actual:</strong>{' '}
                  <span className="text-danger fw-semibold">
                    ${Number(cuentaSeleccionada.saldo || 0).toFixed(2)}
                  </span>
                </div>

                {/* Abonos */}
                <div className="mb-2">
                  <h6 className="small fw-bold">Abonos</h6>
                  <div
                    className="border rounded"
                    style={{ maxHeight: 140, overflowY: 'auto' }}
                  >
                    <table className="table table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: 160 }}>Fecha</th>
                          <th className="text-end" style={{ width: 100 }}>
                            Cantidad
                          </th>
                          <th className="text-end" style={{ width: 100 }}>
                            Viejo saldo
                          </th>
                          <th className="text-end" style={{ width: 100 }}>
                            Nuevo saldo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {abonosDeCuenta.map((a) => (
                          <tr key={a.id}>
                            <td className="small">
                              {a.fecha?.replace('T', ' ').substring(0, 19)}
                            </td>
                            <td className="text-end text-success">
                              ${Number(a.cantidad || 0).toFixed(2)}
                            </td>
                            <td className="text-end small">
                              ${Number(a.viejoSaldo || 0).toFixed(2)}
                            </td>
                            <td className="text-end small">
                              ${Number(a.nuevoSaldo || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}

                        {abonosDeCuenta.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-muted py-2 small"
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
                    className="border rounded"
                    style={{ maxHeight: 140, overflowY: 'auto' }}
                  >
                    <table className="table table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: 70 }}>Venta</th>
                          <th style={{ width: 160 }}>Fecha</th>
                          <th className="text-end" style={{ width: 100 }}>
                            Total
                          </th>
                          <th style={{ width: 90 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasDeCuenta.map((v) => (
                          <tr key={v.id}>
                            <td>{v.id}</td>
                            <td className="small">
                              {v.fecha?.replace('T', ' ').substring(0, 19)}
                            </td>
                            <td className="text-end fw-semibold">
                              ${Number(v.total || 0).toFixed(2)}
                            </td>
                            <td className="small">{v.status}</td>
                          </tr>
                        ))}

                        {ventasDeCuenta.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-muted py-2 small"
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
  );
}
