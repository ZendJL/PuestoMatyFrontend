import { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney, formatFecha } from '../../utils/format';

export default function ReporteDeudas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  const { data: cuentasRaw, isLoading, error } = useQuery({
    queryKey: ['cuentas-reporte-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas');
      return res.data;
    },
  });

  const {
    data: ventasRaw,
    isLoading: loadingVentas,
    error: errorVentas,
  } = useQuery({
    queryKey: ['ventas-reporte-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas');
      return res.data;
    },
  });

  const cuentas = Array.isArray(cuentasRaw) ? cuentasRaw : [];
  const ventas = Array.isArray(ventasRaw) ? ventasRaw : [];

  const cuentasConDeuda = useMemo(() => {
    const texto = busqueda.toLowerCase();
    return cuentas
      .filter((c) => (c.saldo || 0) > 0)
      .filter((c) =>
        texto
          ? c.nombre?.toLowerCase().includes(texto) ||
            c.descripcion?.toLowerCase().includes(texto)
          : true
      )
      .sort((a, b) => (b.saldo || 0) - (a.saldo || 0));
  }, [cuentas, busqueda]);

  const ventasDeCuenta = useMemo(() => {
    if (!cuentaSeleccionada) return [];
    return ventas
      .filter((v) => {
        const idCuentaVenta = v.cuenta?.id ?? v.cuentaId;
        return idCuentaVenta === cuentaSeleccionada.id;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [ventas, cuentaSeleccionada]);

  const totalDeudores = cuentasConDeuda.length;
  const totalDeuda = cuentasConDeuda.reduce(
    (sum, c) => sum + (c.saldo || 0),
    0
  );

  if (isLoading || loadingVentas) {
    return <div className="fs-6">Cargando datos...</div>;
  }
  if (error || errorVentas) {
    return <div className="text-danger fs-6">Error al cargar datos</div>;
  }

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm fs-6 w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)',
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Header azul */}
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Reporte de deudas</h5>
            <small className="text-white-50">
              Cuentas con saldo pendiente y sus ventas a crédito.
            </small>
          </div>
          <div className="text-end">
            <div className="text-white-50">
              Cuentas con deuda:{' '}
              <strong className="text-warning">{totalDeudores}</strong>
            </div>
            <div className="fw-semibold text-warning">
              Total adeudado: {formatMoney(totalDeuda)}
            </div>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          <div className="row g-3">
            {/* Columna izquierda: cuentas */}
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-end mb-2">
                <div className="flex-grow-1 me-2">
                  <label className="form-label mb-1">Buscar cliente</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Nombre o descripción de la cuenta..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                <div className="text-body-primary small">
                  {totalDeudores} cuentas listadas
                </div>
              </div>

              <div
                className="border rounded small bg-body"
                style={{ maxHeight: 320, overflowY: 'auto' }}
              >
                <table className="table table-hover table-striped mb-0 align-middle fs-6">
                  <thead className="sticky-top">
                    <tr>
                      <th style={{ width: 70 }}>ID</th>
                      <th>Cliente</th>
                      <th className="text-end" style={{ width: 130 }}>
                        Saldo pendiente
                      </th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuentasConDeuda.map((c) => (
                      <tr
                        key={c.id}
                        style={{ cursor: 'pointer' }}
                        className={
                          cuentaSeleccionada?.id === c.id ? 'table-primary' : ''
                        }
                        onClick={() => {
                          setCuentaSeleccionada(c);
                          setVentaSeleccionada(null);
                        }}
                      >
                        <td className="text-body-primary small">{c.id}</td>
                        <td>
                          <div className="fw-semibold">{c.nombre}</div>
                        </td>
                        <td className="text-end">
                          <span className="badge bg-danger-subtle text-danger fw-semibold">
                            {formatMoney(c.saldo || 0)}
                          </span>
                        </td>
                        <td
                          className="text-truncate text-body-primary small"
                          style={{ maxWidth: 220 }}
                        >
                          {c.descripcion}
                        </td>
                      </tr>
                    ))}

                    {cuentasConDeuda.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-body-primary py-3"
                        >
                          No hay cuentas con deudas pendientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Columna derecha: detalle */}
            <div className="col-md-6">
              <div className="card h-100 fs-6">
                <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
                  <h6 className="mb-0">Detalle de la cuenta</h6>
                  {cuentaSeleccionada && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setCuentaSeleccionada(null);
                        setVentaSeleccionada(null);
                      }}
                    >
                      Quitar selección
                    </button>
                  )}
                </div>
                <div className="card-body py-2 bg-body">
                  {!cuentaSeleccionada && (
                    <div className="text-body-primary">
                      Haz clic en una cuenta de la tabla izquierda para ver sus
                      ventas a crédito y productos.
                    </div>
                  )}

                  {cuentaSeleccionada && (
                    <>
                      <div className="mb-2">
                        <div className="fw-semibold">
                          {cuentaSeleccionada.nombre} (ID{' '}
                          {cuentaSeleccionada.id})
                        </div>
                        <div>
                          Saldo pendiente:{' '}
                          <span className="text-danger fw-bold">
                            {formatMoney(cuentaSeleccionada.saldo || 0)}
                          </span>
                        </div>
                        {cuentaSeleccionada.descripcion && (
                          <div className="text-body-primary small">
                            Notas: {cuentaSeleccionada.descripcion}
                          </div>
                        )}
                      </div>

                      {/* Ventas a crédito */}
                      <h6 className="fw-bold mb-1">Ventas a crédito</h6>
                      <div
                        className="border rounded small bg-body mb-2"
                        style={{ maxHeight: 200, overflowY: 'auto' }}
                      >
                        <table className="table table-sm table-striped mb-0 align-middle fs-6">
                          <thead className="sticky-top">
                            <tr>
                              <th style={{ width: 70 }}>Venta</th>
                              <th style={{ width: 170 }}>Fecha</th>
                              <th
                                className="text-end"
                                style={{ width: 120 }}
                              >
                                Total
                              </th>
                              <th style={{ width: 110 }}>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventasDeCuenta.map((v) => (
                              <tr
                                key={v.id}
                                style={{ cursor: 'pointer' }}
                                className={
                                  ventaSeleccionada?.id === v.id
                                    ? 'table-primary'
                                    : ''
                                }
                                onClick={() => setVentaSeleccionada(v)}
                              >
                                <td className="text-body-primary small">
                                  {v.id}
                                </td>
                                <td className="small">
                                  {formatFecha(v.fecha)}
                                </td>
                                <td className="text-end fw-semibold">
                                  {formatMoney(v.total || 0)}
                                </td>
                                <td>
                                  {v.status === 'PRESTAMO' ? (
                                    <span className="badge bg-warning text-dark">
                                      Préstamo
                                    </span>
                                  ) : (
                                    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">
                                      {v.status}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {ventasDeCuenta.length === 0 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="text-center text-body-primary py-3"
                                >
                                  Esta cuenta no tiene ventas registradas.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Productos de la venta seleccionada */}
                      {ventaSeleccionada && (
                        <div className="mt-2">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <h6 className="fw-bold mb-0">
                              Productos de la venta #{ventaSeleccionada.id}
                            </h6>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setVentaSeleccionada(null)}
                            >
                              Quitar venta
                            </button>
                          </div>

                          <div
                            className="border rounded small bg-body"
                            style={{ maxHeight: 200, overflowY: 'auto' }}
                          >
                            <table className="table table-sm table-striped mb-0 align-middle fs-6">
                              <thead className="sticky-top">
                                <tr>
                                  <th>Producto</th>
                                  <th
                                    className="text-center"
                                    style={{ width: 80 }}
                                  >
                                    Cantidad
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ width: 110 }}
                                  >
                                    Precio
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ width: 120 }}
                                  >
                                    Importe
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {ventaSeleccionada.ventaProductos?.map((vp) => {
                                  const precio =
                                    vp.precioUnitario ?? vp.precio ?? 0;
                                  const cantidad = vp.cantidad || 0;
                                  const importe = cantidad * precio;

                                  return (
                                    <tr key={vp.id}>
                                      <td>
                                        {vp.producto?.descripcion ||
                                          `Producto ${vp.producto?.id}`}
                                        {vp.producto?.codigo && (
                                          <div className="text-body-primary small">
                                            Código: {vp.producto.codigo}
                                          </div>
                                        )}
                                      </td>
                                      <td className="text-center">
                                        {cantidad}
                                      </td>
                                      <td className="text-end">
                                        {formatMoney(precio)}
                                      </td>
                                      <td className="text-end fw-semibold">
                                        {formatMoney(importe)}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {(!ventaSeleccionada.ventaProductos ||
                                  ventaSeleccionada.ventaProductos.length ===
                                    0) && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="text-center text-body-primary py-3"
                                    >
                                      Esta venta no tiene productos
                                      registrados.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
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
