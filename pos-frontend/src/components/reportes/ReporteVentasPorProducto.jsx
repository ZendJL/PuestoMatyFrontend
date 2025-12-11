import { useState, useMemo } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '../../utils/format';

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

  // sort de tabla
  const [sortConfig, setSortConfig] = useState({
    key: 'totalGanancia',
    direction: 'desc',
  });

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

    const filtrados = ventaProductos.filter((vp) => {
      if (!vp.venta?.fecha) return false;
      const f = new Date(vp.venta.fecha);
      return f >= dDesde && f <= dHasta;
    });

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

    const texto = busqueda.toLowerCase();
    if (texto) {
      arr = arr.filter(
        (p) =>
          p.descripcion?.toLowerCase().includes(texto) ||
          p.codigo?.toLowerCase().includes(texto)
      );
    }

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

  const sortedDatos = useMemo(() => {
    const arr = [...datosAgrupados];
    if (!sortConfig.key) return arr;

    arr.sort((a, b) => {
      const { key, direction } = sortConfig;
      let vA = a[key];
      let vB = b[key];

      if (typeof vA === 'string') vA = vA.toLowerCase();
      if (typeof vB === 'string') vB = vB.toLowerCase();

      let comp = 0;
      if (vA < vB) comp = -1;
      if (vA > vB) comp = 1;

      return direction === 'asc' ? comp : -comp;
    });

    return arr;
  }, [datosAgrupados, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        direction:
          key === 'descripcion' || key === 'codigo' ? 'asc' : 'desc',
      };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <span className="text-body-primary ms-1">↕</span>;
    return (
      <span className="ms-1">
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const aplicarPeriodo = (nuevoTipo) => {
    setTipoPeriodo(nuevoTipo);
    if (nuevoTipo === 'rango') return;
    const { desde: di, hasta: df } = getInicioFinPeriodo(nuevoTipo);
    setDesde(formatoFechaInput(di));
    setHasta(formatoFechaInput(df));
  };

  if (isLoading) {
    return <div className="fs-6">Cargando ventas por producto...</div>;
  }
  if (error) {
    return <div className="text-danger fs-6">Error al cargar ventas</div>;
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
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Ventas por producto</h5>
            <small className="text-white-50">
              Analiza qué productos se venden más y cuál es su ganancia en el período.
            </small>
          </div>
        </div>

        <div className="card-body py-3 bg-body">
          {/* Resumen */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Productos vendidos</div>
                <div className="fs-5 fw-bold">{totalProductos}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Unidades totales</div>
                <div className="fs-5 fw-bold">{totalUnidades}</div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Importe total</div>
                <div className="fs-5 fw-bold text-success">
                  {formatMoney(totalImporte)}
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="border rounded p-2 bg-body">
                <div className="small text-body-primary">Ganancia total</div>
                <div className="fs-5 fw-bold text-primary">
                  {formatMoney(totalGanancia)}
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="border rounded p-2 mb-3 bg-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <label className="form-label mb-1">Período rápido</label>
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn btn-outline-primary ${
                      tipoPeriodo === 'dia' ? 'active' : ''
                    }`}
                    onClick={() => aplicarPeriodo('dia')}
                  >
                    Hoy
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

              <div className="col small text-body-primary">
                {totalProductos} productos distintos en el rango seleccionado.
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="card">
            <div className="card-header py-2 d-flex justify-content-between align-items-center bg-body-tertiary">
              <h6 className="mb-0">Detalle por producto</h6>
              <small className="text-body-primary">
                Clic en los encabezados para ordenar
              </small>
            </div>
            <div className="card-body p-0 bg-body">
              <div
                className="table-responsive"
                style={{ maxHeight: 360, overflowY: 'auto' }}
              >
                <table className="table table-sm table-hover table-striped mb-0 align-middle fs-6">
                  <thead className="sticky-top">
                    <tr>
                      <th
                        style={{ width: 70, cursor: 'pointer' }}
                        onClick={() => handleSort('productoId')}
                      >
                        ID
                        {renderSortIcon('productoId')}
                      </th>
                      <th
                        style={{ minWidth: 220, cursor: 'pointer' }}
                        onClick={() => handleSort('descripcion')}
                      >
                        Producto
                        {renderSortIcon('descripcion')}
                      </th>
                      <th
                        className="text-center"
                        style={{ width: 110, cursor: 'pointer' }}
                        onClick={() => handleSort('totalCantidad')}
                      >
                        Unidades Vendidas
                        {renderSortIcon('totalCantidad')}
                      </th>
                      <th
                        className="text-end"
                        style={{ width: 140, cursor: 'pointer' }}
                        onClick={() => handleSort('costoCompraReferencia')}
                      >
                        Costo
                        {renderSortIcon('costoCompraReferencia')}
                      </th>
                      <th
                        className="text-end"
                        style={{ width: 140, cursor: 'pointer' }}
                        onClick={() => handleSort('precioVentaReferencia')}
                      >
                        Precio
                        {renderSortIcon('precioVentaReferencia')}
                      </th>
                      <th
                        className="text-end"
                        style={{ width: 140, cursor: 'pointer' }}
                        onClick={() => handleSort('totalVentas')}
                      >
                        Importe total
                        {renderSortIcon('totalVentas')}
                      </th>
                      <th
                        className="text-end"
                        style={{ width: 140, cursor: 'pointer' }}
                        onClick={() => handleSort('totalGanancia')}
                      >
                        Ganancia total
                        {renderSortIcon('totalGanancia')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDatos.map((p) => {
                      const precioVenta = p.totalCantidad
                        ? p.totalVentas / p.totalCantidad // precio promedio
                        : p.precioVentaReferencia;
                      const costoCompra = p.totalCantidad
                        ? p.totalCosto / p.totalCantidad // costo promedio
                        : p.costoCompraReferencia;

                      return (
                        <tr key={p.productoId}>
                          <td className="small text-body-primary">
                            {p.productoId}
                          </td>
                          <td className="small">
                            <div
                              className="fw-semibold text-truncate"
                              style={{ maxWidth: 260 }}
                            >
                              {p.descripcion}
                            </div>
                            <div className="text-body-primary small">
                              Código: {p.codigo}
                            </div>
                          </td>
                          <td className="text-center fw-semibold">
                            {p.totalCantidad}
                          </td>
                          <td className="text-end text-body-primary">
                            {formatMoney(costoCompra)}
                          </td>
                          <td className="text-end">
                            {formatMoney(precioVenta)}
                          </td>
                          <td className="text-end fw-semibold text-success">
                            {formatMoney(p.totalVentas)}
                          </td>
                          <td className="text-end fw-semibold text-primary">
                            {formatMoney(p.totalGanancia)}
                          </td>
                        </tr>
                      );
                    })}

                    {sortedDatos.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center text-body-primary py-3"
                        >
                          No hay ventas en el período seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
