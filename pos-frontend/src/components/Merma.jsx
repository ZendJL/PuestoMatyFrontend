import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

const TIPOS_MERMA = ['CADUCADO', 'USO_PERSONAL', 'MAL_ESTADO', 'ROBO', 'OTRO'];

const labelTipo = (t) =>
  t === 'CADUCADO'
    ? 'Caducado'
    : t === 'USO_PERSONAL'
    ? 'Uso personal'
    : t === 'MAL_ESTADO'
    ? 'Mal estado'
    : t === 'ROBO'
    ? 'Robo'
    : 'Otro';

export default function Merma() {
  const [itemsMerma, setItemsMerma] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoMerma, setTipoMerma] = useState('CADUCADO');
  const [descripcionMerma, setDescripcionMerma] = useState('');

  const { data: productos, isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: () => axios.get('/api/productos').then((res) => res.data),
  });

  const productosFiltrados = (productos || [])
    .filter((p) => {
      const q = busqueda.toLowerCase();
      return (
        p.codigo?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const agregarItemMerma = (producto) => {
    if (!producto) return;

    setItemsMerma((prev) => {
      const existe = prev.find((i) => i.id === producto.id);
      if (existe) {
        return prev.map((i) =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });

    setBusqueda('');
  };

  const manejarSeleccionPorEnter = () => {
    if (!busqueda) return;

    const exacto = productos?.find(
      (p) => p.codigo?.toLowerCase() === busqueda.toLowerCase()
    );
    if (exacto) {
      agregarItemMerma(exacto);
      return;
    }
    if (productosFiltrados.length > 0) {
      agregarItemMerma(productosFiltrados[0]);
    }
  };

  const quitarItem = (id) => {
    setItemsMerma((prev) => prev.filter((i) => i.id !== id));
  };

  const cambiarCantidadItem = (id, nuevaCantidad) => {
    if (nuevaCantidad < 1 || Number.isNaN(nuevaCantidad)) return;
    setItemsMerma((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i))
    );
  };

  const guardarMerma = async () => {
    if (itemsMerma.length === 0) {
      alert('No hay productos en merma');
      return;
    }

    try {
      const fecha = new Date().toISOString();

      const mermaData = {
        tipoMerma,
        descripcion: descripcionMerma,
        fechaSalida: fecha,
        mermaProductos: itemsMerma.map((item) => ({
          producto: { id: item.id },
          cantidad: item.cantidad,
        })),
      };

      await axios.post('/api/mermas', mermaData);

      alert('✅ Merma registrada correctamente');
      setItemsMerma([]);
      setDescripcionMerma('');
      setBusqueda('');
    } catch (err) {
      console.error(err);
      alert('❌ Error al registrar merma');
    }
  };

  if (isLoading) return <div className="p-3 fs-6">Cargando productos...</div>;
  if (error)
    return (
      <div className="p-3 text-danger fs-6">Error al cargar productos</div>
    );

  const totalItems = itemsMerma.reduce((sum, i) => sum + (i.cantidad || 0), 0);

  return (
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm fs-6 w-100"
        style={{
          maxWidth: 'calc(100vw - 100px)', // 50px de margen lateral
          marginTop: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Header azul */}
        <div className="card-header py-2 d-flex justify-content-between align-items-center bg-primary text-white">
          <div>
            <h5 className="mb-0">Registro de merma</h5>
            <small className="text-white-100">
              Registra productos caducados, dañados, de uso interno, robo u
              otros.
            </small>
          </div>
          <div className="text-end">
            <div className="text-white-100">Productos en merma</div>
            <div className="fs-5 fw-bold text-warning">{totalItems}</div>
          </div>
        </div>

        <div className="card-body py-3">
          <div className="row g-3">
            {/* Columna izquierda: datos generales y buscador */}
            <div className="col-md-6 border-end">
              {/* Datos generales */}
              <div className="mb-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-semibold">
                    Tipo de merma
                  </label>
                  <div className="btn-group btn-group-sm w-100" role="group">
                    {TIPOS_MERMA.map((t) => {
                      const activo = tipoMerma === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`btn ${
                            activo ? 'btn-primary' : 'btn-outline-primary'
                          }`}
                          onClick={() => setTipoMerma(t)}
                        >
                          {labelTipo(t)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="form-label mb-1 fw-semibold">
                    Descripción general
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    placeholder="Ej. Productos caducados en anaquel 3, revisión semanal..."
                    value={descripcionMerma}
                    onChange={(e) => setDescripcionMerma(e.target.value)}
                  />
                </div>
              </div>

              {/* Buscador */}
              <div className="mb-2">
                <label className="form-label mb-1 fw-semibold">
                  Agregar productos a la merma
                </label>
                <input
                  className="form-control form-control-sm"
                  placeholder="Escanea código o escribe descripción y presiona Enter..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && manejarSeleccionPorEnter()
                  }
                />
                <small className="text-body-secondary">
                  Cada selección agrega 1 unidad; puedes ajustar las cantidades
                  en la tabla de la derecha.
                </small>
              </div>

              {/* Resultados */}
              {busqueda && productosFiltrados.length > 0 && (
                <div
                  className="mb-3 border rounded bg-body-tertiary"
                  style={{ maxHeight: 170, overflowY: 'auto' }}
                >
                  <table className="table table-hover table-sm mb-0 align-middle fs-6">
                    <tbody>
                      {productosFiltrados.map((p) => (
                        <tr
                          key={p.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => agregarItemMerma(p)}
                        >
                          <td
                            className="text-truncate"
                            style={{ maxWidth: 260 }}
                          >
                            <div className="fw-semibold">{p.descripcion}</div>
                            <div className="text-body-secondary">
                              Código: {p.codigo}
                            </div>
                          </td>
                          <td className="text-end align-middle">
                            <div className="text-body-secondary">
                              Inventario: {p.cantidad}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Columna derecha: tabla de merma */}
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Detalle de productos en merma</h6>
                <span className="text-body-secondary">
                  {itemsMerma.length} productos diferentes
                </span>
              </div>

              <div
                className="border rounded bg-body"
                style={{ maxHeight: 320, overflowY: 'auto' }}
              >
                <table className="table table-hover table-sm mb-0 align-middle fs-6">
                  <thead className="sticky-top">
                    <tr>
                      <th>Producto</th>
                      <th className="text-center" style={{ width: 90 }}>
                        Cant.
                      </th>
                      <th className="text-end" style={{ width: 70 }}>
                        Quitar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsMerma.map((item) => (
                      <tr key={item.id}>
                        <td className="text-truncate" style={{ maxWidth: 230 }}>
                          {item.descripcion}
                          <div className="text-body-secondary">
                            Código: {item.codigo}
                          </div>
                        </td>
                        <td className="text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              cambiarCantidadItem(
                                item.id,
                                parseInt(e.target.value, 10) || 1
                              )
                            }
                            className="form-control form-control-sm text-center"
                          />
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => quitarItem(item.id)}
                            className="btn btn-sm btn-outline-danger"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                    {itemsMerma.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-body-secondary py-3"
                        >
                                                    No hay productos en merma. Agrega alguno desde el
                          buscador de la izquierda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-stretch py-2 gap-2">
          <button
            onClick={() => {
              setItemsMerma([]);
              setDescripcionMerma('');
              setBusqueda('');
            }}
            className="btn btn-sm btn-outline-secondary w-100"
          >
            Limpiar formulario
          </button>
          <button
            onClick={guardarMerma}
            disabled={itemsMerma.length === 0}
            className="btn btn-sm btn-danger w-100"
          >
            Guardar merma
          </button>
        </div>
      </div>
    </div>
  );
}

