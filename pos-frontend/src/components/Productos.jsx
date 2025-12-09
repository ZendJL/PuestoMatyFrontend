import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';

export default function Productos() {
  const [busqueda, setBusqueda] = useState('');
  
  const { data: productos, isLoading, error } = useQuery({
    queryKey: ['productos', busqueda],
    queryFn: () => axios.get('/api/productos').then(res => res.data),
    retry: 1
  });

  if (isLoading) return <div className="p-4">Cargando productos...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  const filtrados = productos?.filter(p => 
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Inventario</h1>
      <input 
        className="w-full max-w-md p-2 border rounded mb-6"
        placeholder="Buscar producto..." 
        value={busqueda} 
        onChange={e => setBusqueda(e.target.value)}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map(producto => (
          <div key={producto.id} className="border p-4 rounded-lg shadow">
            <h3 className="font-semibold">{producto.descripcion}</h3>
            <p className="text-2xl font-bold text-green-600">${producto.precio}</p>
            <p>Inventario: <span className="font-mono">{producto.cantidad}</span></p>
            <p>Código: {producto.codigo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
