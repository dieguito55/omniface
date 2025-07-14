import { useEffect, useState } from "react";
import api from "../api/api";

export default function SalidasHoy() {
  const [salidas, setSalidas] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = JSON.parse(atob(token.split('.')[1]));
    const usuario_id = payload.id;

    const fetchData = () => {
      api.get(`/recon/salida/dia/${usuario_id}`)
        .then(r => setSalidas(r.data))
        .catch(() => setSalidas([]));
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtradas = salidas.filter(s =>
    s.nombre?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-[#2C2F4A]">Salidas del Día</h2>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="p-2 border rounded w-64"
        />
      </div>
      
      <div className="relative">
        <div className={`flex space-x-4 pb-4 overflow-x-auto ${filtradas.length > 5 ? 'scrollbar-default' : 'scrollbar-hide'}`} style={{ maxWidth: filtradas.length > 5 ? 'calc(5 * 288px)' : '100%' }}>
          {filtradas.map((s, i) => (
            <div key={i} className="flex-shrink-0 w-56 p-3 border rounded-lg shadow-sm">
              <img
                src={`http://localhost:8000/${s.foto_path}`}
                alt={s.nombre}
                className="w-full h-40 object-cover rounded mb-2"
              />
              <p className="font-bold truncate">{s.nombre}</p>
              <p className="text-sm text-gray-600 truncate">{s.departamento || "Sin departamento"}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm">{s.hora}</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Salida
                </span>
              </div>
            </div>
          ))}
          
          {filtradas.length === 0 && (
            <div className="flex-shrink-0 w-full py-8 text-center text-gray-500">
              No hay registros de salida hoy
            </div>
          )}
        </div>
      </div>
    </div>
  );
}