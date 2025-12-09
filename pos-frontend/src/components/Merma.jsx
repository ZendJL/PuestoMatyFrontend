import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

const TIPOS_MERMA = [
  'CADUCADO',
  'USO_PERSONAL',
  'MAL_ESTADO',
  'ROBO',
  'OTRO',
];

export default function Merma() {
  const [itemsMerma, setItemsMerma] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [tipoMerma, setTipoMerma] = useState('CADUCADO');
  const [descripcionMerma, setDescripcionMerma] = useState('');

  const { data: productos, isLoading, error } = useQuery({
    queryKey: ['productos-merma'],
    queryFn: () => axios.get('/api/productos').then(res => res.data),
  });

  const productosFiltrados = (productos || []).filter(p => {
    const q = busqueda.toLowerCase();
    return (
      p.codigo?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  const agregarItemMerma = (producto) => {
    if (!producto) return;
    if (cantidad < 1) return;

    setItemsMerma(prev => {
      const existe = prev.find(i => i.id === producto.id);
      if (existe) {
        return prev.map(i =>
          i.id === producto.id
            ? { ...i, cantidad: i.cantidad + cantidad }
            : i
        );
      }
      return [...prev, { ...producto, cantidad }];
    });

    setBusqueda('');
  };

  const manejarSeleccionPorEnter = () => {
    if (!busqueda) return;

    const exacto = productos?.find(
      p => p.codigo?.toLowerCase() === busqueda.toLowerCase()
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
    setItemsMerma(prev => prev.filter(i => i.id !== id));
  };

  const cambiarCantidadItem = (id, nuevaCantidad) => {
    if (nuevaCantidad < 1 || Number.isNaN(nuevaCantidad)) return;
    setItemsMerma(prev =>
      prev.map(i =>
        i.id === id ? { ...i, cantidad: nuevaCantidad } : i
      )
    );
  };

const guardarMerma = async () => {
  if (itemsMerma.length === 0) {
    alert('No hay productos en merma');
    return;
  }
  if (!descripcionMerma.trim()) {
    alert('Captura una descripción de la merma');
    return;
  }

  try {
    const fecha = new Date().toISOString();

    const mermaData = {
      tipoMerma, // "CADUCIDAD", "ROBO", etc. Debe coincidir con el enum
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
    setCantidad(1);
  } catch (err) {
    console.error(err);
    alert('❌ Error al registrar merma');
  }
};


  if (isLoading) return <div className="p-6">Cargando productos...</div>;
  if (error) return <div className="p-6 text-red-500">Error al cargar productos</div>;

 return (
  <div className="card shadow-sm">
    <div className="card-header py-2">
      <h5 className="mb-0">Registro de merma</h5>
    </div>

    <div className="card-body py-3">
      {/* Datos generales */}
      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label mb-1">Tipo de merma</label>
          <div className="d-flex flex-wrap gap-2">
            {TIPOS_MERMA.map((t) => (
              <div className="form-check form-check-inline" key={t}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="tipoMerma"
                  id={`tipo-${t}`}
                  value={t}
                  checked={tipoMerma === t}
                  onChange={(e) => setTipoMerma(e.target.value)}
                />
                <label className="form-check-label small" htmlFor={`tipo-${t}`}>
                  {t}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-8">
          <label className="form-label mb-1">Descripción</label>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Ej. Productos caducados en anaquel 3..."
            value={descripcionMerma}
            onChange={(e) => setDescripcionMerma(e.target.value)}
          />
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-3">
        <label className="form-label mb-1">
          Buscar producto (código o descripción)
        </label>
        <div className="row g-2">
          <div className="col">
            <input
              className="form-control form-control-sm"
              placeholder="Escanea código o escribe nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && manejarSeleccionPorEnter()}
            />
          </div>
          <div className="col-auto">
            <input
              type="number"
              min="1"
              className="form-control form-control-sm text-center"
              value={cantidad}
              onChange={(e) =>
                setCantidad(parseInt(e.target.value, 10) || 1)
              }
            />
          </div>
        </div>
      </div>

      {/* Resultados */}
      {busqueda && productosFiltrados.length > 0 && (
        <div className="mb-3 border rounded small" style={{ maxHeight: 160, overflowY: 'auto' }}>
          <table className="table table-hover table-sm mb-0">
            <tbody>
              {productosFiltrados.map((p) => (
                <tr
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => agregarItemMerma(p)}
                >
                  <td className="text-truncate" style={{ maxWidth: 240 }}>
                    <div className="fw-semibold">{p.descripcion}</div>
                    <div className="text-muted small">Código: {p.codigo}</div>
                  </td>
                  <td className="text-end align-middle">
                    <div className="text-muted small">Inventario: {p.cantidad}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla merma */}
      <div className="border rounded small" style={{ maxHeight: 260, overflowY: 'auto' }}>
        <table className="table table-striped table-hover table-sm mb-0">
          <thead className="table-light sticky-top">
            <tr>
              <th>Producto</th>
              <th className="text-center">Cant.</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {itemsMerma.map((item) => (
              <tr key={item.id}>
                <td className="text-truncate" style={{ maxWidth: 220 }}>
                  {item.descripcion}
                  <div className="small text-muted">
                    Código: {item.codigo}
                  </div>
                </td>
                <td className="text-center" style={{ width: 80 }}>
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
                <td colSpan={3} className="text-center text-muted py-3">
                  No hay productos en merma. Agrega alguno desde el buscador.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Acciones */}
    <div className="card-footer d-flex justify-content-end gap-2 py-2">
      <button
        onClick={() => setItemsMerma([])}
        className="btn btn-sm btn-secondary"
      >
        Limpiar
      </button>
      <button
        onClick={guardarMerma}
        disabled={itemsMerma.length === 0}
        className="btn btn-sm btn-danger"
      >
        Guardar merma
      </button>
    </div>
  </div>
);

}
