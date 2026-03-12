import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const TasaCambioContext = createContext(null);

export function TasaCambioProvider({ children }) {
  const [tasaCambio, setTasaCambioState] = useState(17);
  const [loadingTasa, setLoadingTasa] = useState(true);

  // Cargar tasa desde BD al iniciar
  useEffect(() => {
    axios.get('/api/configuracion/tasa-cambio')
      .then(res => setTasaCambioState(res.data.tasa))
      .catch(() => setTasaCambioState(17))
      .finally(() => setLoadingTasa(false));
  }, []);

  // Guardar tasa en BD y estado local
  const setTasaCambio = useCallback(async (nuevaTasa) => {
    const tasa = Number(nuevaTasa);
    if (isNaN(tasa) || tasa <= 0) return;
    setTasaCambioState(tasa);
    try {
      await axios.put('/api/configuracion/tasa-cambio', { tasa });
    } catch (e) {
      console.error('Error guardando tasa:', e);
    }
  }, []);

  return (
    <TasaCambioContext.Provider value={{ tasaCambio, setTasaCambio, loadingTasa }}>
      {children}
    </TasaCambioContext.Provider>
  );
}

export function useTasaCambio() {
  const ctx = useContext(TasaCambioContext);
  if (!ctx) throw new Error('useTasaCambio debe usarse dentro de TasaCambioProvider');
  return ctx;
}
