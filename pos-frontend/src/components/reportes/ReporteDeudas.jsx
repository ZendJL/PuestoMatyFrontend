import { useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

export default function ReporteDeudas() {
  const [busqueda, setBusqueda] = useState('');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);

  // Cuentas
  const { data: cuentasRaw, isLoading, error } = useQuery({
    queryKey: ['cuentas-reporte-deudas'],
    queryFn: async () => {
      const res = await axios.get('/api/cuentas');
      return res.data;
    },
  });

  // Ventas (para listar las relacionadas a la cuenta seleccionada)
  const { data: ventasRaw, isLoading: loadingVentas, error: errorVentas } = useQuery({
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

  // Ventas de la cuenta seleccionada
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

  if (isLoading || loadingVentas) return <div>Cargando datos...</div>;
  if (error || errorVentas)
    return <div className="text-danger">Error al cargar datos</div>;

  return (
    <div>
      <h5 className="mb-3">Reporte de deudas no saldadas</h5>

      {/* Filtros */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-4">
          <label className="form-label mb-1">Buscar cliente</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Nombre o descripción de la cuenta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="col small text-muted">
          {totalDeudores} cuentas con deuda · Total adeudado:{' '}
          <span className="fw-semibold text-danger">
            ${totalDeuda.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabla de cuentas */}
      <div className="border rounded mb-3" style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table className="table table-sm table-hover mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th>Cliente / Cuenta</th>
              <th className="text-end" style={{ width: 120 }}>
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
                className={cuentaSeleccionada?.id === c.id ? 'table-active' : ''}
                onClick={() => setCuentaSeleccionada(c)}
              >
                <td>{c.id}</td>
                <td className="small">
                  <div className="fw-semibold">{c.nombre}</div>
                </td>
                <td className="text-end fw-semibold text-danger">
                  ${c.saldo.toFixed(2)}
                </td>
                <td className="small text-truncate" style={{ maxWidth: 260 }}>
                  {c.descripcion}
                </td>
              </tr>
            ))}

            {cuentasConDeuda.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-3">
                  No hay cuentas con deudas pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle de ventas de la cuenta seleccionada */}
      <h6>Ventas de la cuenta seleccionada</h6>
      {!cuentaSeleccionada && (
        <div className="small text-muted mb-2">
          Haz clic en una cuenta para ver sus ventas asociadas.
        </div>
      )}

      {cuentaSeleccionada && (
        <>
          <div className="small mb-2">
            <strong>Cuenta:</strong> {cuentaSeleccionada.nombre} (ID {cuentaSeleccionada.id}){' '}
            · <strong>Saldo:</strong> ${cuentaSeleccionada.saldo.toFixed(2)}
          </div>

          <div className="border rounded" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="table table-sm mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: 70 }}>Venta</th>
                  <th style={{ width: 160 }}>Fecha</th>
                  <th className="text-end" style={{ width: 120 }}>
                    Total
                  </th>
                  <th style={{ width: 100 }}>Status</th>
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
                    <td colSpan={4} className="text-center text-muted py-3">
                      Esta cuenta no tiene ventas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
