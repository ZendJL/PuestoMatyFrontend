import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

function formatoFechaInput(date) {
  return date.toISOString().substring(0, 10); // YYYY-MM-DD
}

function getInicioFinPeriodo(tipo) {
  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (tipo === 'dia') {
    const finDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      23,
      59,
      59
    );
    return { desde: inicioDia, hasta: finDia };
  }
  if (tipo === 'semana') {
    const day = hoy.getDay(); // 0=domingo
    const diff = hoy.getDate() - day + (day === 0 ? -6 : 1); // lunes
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), diff);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return { desde: inicioSemana, hasta: finSemana };
  }
  if (tipo === 'mes') {
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      0,
      23,
      59,
      59
    );
    return { desde: inicioMes, hasta: finMes };
  }
  return { desde: inicioDia, hasta: hoy };
}

export default function ReporteVentasPorProducto() {
  const [tipoPeriodo, setTipoPeriodo] = useState('dia');
  const { desde: dIni, hasta: dFin } = getInicioFinPeriodo('dia');
  const [desde, setDesde] = useState(formatoFechaInput(dIni));
  const [hasta, setHasta] = useState(formatoFechaInput(dFin));
  const [busqueda, setBusqueda] = useState('');

  // Traer todos los VentaProducto
  const { data: vpRaw, isLoading, error } = useQuery({
    queryKey: ['ventas-productos-reporte'],
    queryFn: async () => {
      const res = await axios.get('/api/ventas-productos'); // debe incluir venta y producto
      return res.data;
    },
  });

  const ventaProductos = Array.isArray(vpRaw) ? vpRaw : [];

  const datosAgrupados = useMemo(() => {
    if (!ventaProductos.length) return [];

    const dDesde = new Date(desde + 'T00:00:00');
    const dHasta = new Date(hasta + 'T23:59:59');

    // 1) Filtrar por rango de fechas usando la fecha de la venta
    const filtrados = ventaProductos.filter((vp) => {
      if (!vp.venta?.fecha) return false;
      const f = new Date(vp.venta.fecha);
      return f >= dDesde && f <= dHasta;
    });

    // 2) Agrupar por producto (id) y calcular costo y ganancia
    const mapa = new Map();
    filtrados.forEach((vp) => {
      const prod = vp.producto || {};
      const id = prod.id;
      if (!id) return;

      const clave = id;
      const existente = mapa.get(clave) || {
        productoId: id,
        codigo: prod.codigo,
        descripcion: prod.descripcion,
        totalCantidad: 0,
        totalVentas: 0,
        totalCosto: 0,
        totalGanancia: 0,
        precioVentaReferencia: prod.precio ?? 0,
        costoCompraReferencia: prod.precioCompra ?? 0,
      };

      const precioVenta = vp.precioUnitario ?? prod.precio ?? 0;
      const costoCompra = prod.precioCompra ?? 0;
      const cantidad = vp.cantidad || 0;

      const subtotalVenta = precioVenta * cantidad;
      const subtotalCosto = costoCompra * cantidad;
      const subtotalGanancia = subtotalVenta - subtotalCosto;

      existente.totalCantidad += cantidad;
      existente.totalVentas += subtotalVenta;
      existente.totalCosto += subtotalCosto;
      existente.totalGanancia += subtotalGanancia;
      existente.precioVentaReferencia = precioVenta;
      existente.costoCompraReferencia = costoCompra;

      mapa.set(clave, existente);
    });

    let arr = Array.from(mapa.values());

    // 3) Filtro por texto producto
    const texto = busqueda.toLowerCase();
    if (texto) {
      arr = arr.filter(
        (p) =>
          p.descripcion?.toLowerCase().includes(texto) ||
          p.codigo?.toLowerCase().includes(texto)
      );
    }

    // 4) Ordenar por monto vendido desc
    arr.sort((a, b) => b.totalVentas - a.totalVentas);

    return arr;
  }, [ventaProductos, desde, hasta, busqueda]);

  const totalProductos = datosAgrupados.length;
  const totalUnidades = datosAgrupados.reduce(
    (sum, p) => sum + p.totalCantidad,
    0
  );
  const totalImporte = datosAgrupados.reduce(
    (sum, p) => sum + p.totalVentas,
    0
  );
  const totalGanancia = datosAgrupados.reduce(
    (sum, p) => sum + p.totalGanancia,
    0
  );

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  if (isLoading) return <div>Cargando ventas por producto...</div>;
  if (error) return <div className="text-danger">Error al cargar ventas</div>;

  return (
    <div>
      <h5 className="mb-3">Historial de ventas por producto</h5>

      {/* Filtros */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label mb-1">Período</label>
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={`btn btn-outline-primary ${
                tipoPeriodo === 'dia' ? 'active' : ''
              }`}
              onClick={() => aplicarPeriodo('dia')}
            >
              Día
            </button>
            <button
              type="button"
              className={`btn btn-outline-primary ${
                tipoPeriodo === 'semana' ? 'active' : ''
              }`}
              onClick={() => aplicarPeriodo('semana')}
            >
              Semana
            </button>
            <button
              type="button"
              className={`btn btn-outline-primary ${
                tipoPeriodo === 'mes' ? 'active' : ''
              }`}
              onClick={() => aplicarPeriodo('mes')}
            >
              Mes
            </button>
            <button
              type="button"
              className={`btn btn-outline-primary ${
                tipoPeriodo === 'rango' ? 'active' : ''
              }`}
              onClick={() => aplicarPeriodo('rango')}
            >
              Rango
            </button>
          </div>
        </div>

        <div className="col-auto">
          <label className="form-label mb-1">Desde</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <label className="form-label mb-1">Hasta</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label mb-1">Buscar producto</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="col small text-muted">
          {totalProductos} productos · {totalUnidades} unidades · Total:{' '}
          <span className="fw-semibold text-success">
            ${totalImporte.toFixed(2)}
          </span>{' '}
          · Ganancia total:{' '}
          <span className="fw-semibold text-primary">
            ${totalGanancia.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div
        className="border rounded"
        style={{ maxHeight: 320, overflowY: 'auto' }}
      >
        <table className="table table-sm table-hover mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th style={{ width: 80 }}>ID</th>
              <th>Producto</th>
              <th className="text-center" style={{ width: 90 }}>
                Cantidad
              </th>
              <th className="text-end" style={{ width: 100 }}>
                P. venta
              </th>
              <th className="text-end" style={{ width: 110 }}>
                Costo compra
              </th>
              <th className="text-end" style={{ width: 110 }}>
                Ganancia unid.
              </th>
              <th className="text-end" style={{ width: 120 }}>
                Importe total
              </th>
              <th className="text-end" style={{ width: 120 }}>
                Ganancia total
              </th>
            </tr>
          </thead>
          <tbody>
            {datosAgrupados.map((p) => {
              const precioVenta = p.totalCantidad
                ? p.totalVentas / p.totalCantidad
                : p.precioVentaReferencia;
              const costoCompra = p.totalCantidad
                ? p.totalCosto / p.totalCantidad
                : p.costoCompraReferencia;
              const gananciaUnidad = precioVenta - costoCompra;

              return (
                <tr key={p.productoId}>
                  <td>{p.productoId}</td>
                  <td className="small text-truncate" style={{ maxWidth: 260 }}>
                    {p.descripcion}
                    <div className="text-muted small">
                      Código: {p.codigo}
                    </div>
                  </td>
                  <td className="text-center">{p.totalCantidad}</td>
                  <td className="text-end">
                    ${precioVenta.toFixed(2)}
                  </td>
                  <td className="text-end">
                    ${costoCompra.toFixed(2)}
                  </td>
                  <td className="text-end">
                    ${gananciaUnidad.toFixed(2)}
                  </td>
                  <td className="text-end fw-semibold text-success">
                    ${p.totalVentas.toFixed(2)}
                  </td>
                  <td className="text-end fw-semibold text-primary">
                    ${p.totalGanancia.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {datosAgrupados.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-3">
                  No hay ventas en el período seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
