import { useEffect, useState } from "react";
import api from "../api/api";

export default function AsistenciasHoy() {
  const [asistencias, setAsistencias] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = JSON.parse(atob(token.split('.')[1]));
    const usuario_id = payload.id;

    const fetchData = () => {
      api.get(`/asistencia/dia/${usuario_id}`)
        .then(r => setAsistencias(r.data))
        .catch(() => setAsistencias([]));
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtradas = asistencias.filter(a =>
    a.nombre?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-[#2C2F4A]">Asistencias del Día</h2>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="p-2 border rounded w-64"
        />
      </div>
      
      <div className="relative">
        <div className="flex space-x-4 pb-4 overflow-x-auto scrollbar-hide hover:scrollbar-default">
          {filtradas.map((a, i) => (
            <div key={i} className="flex-shrink-0 w-56 p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <img
                src={`http://localhost:8000/${a.foto_path}`}
                alt={a.nombre}
                className="w-full h-40 object-cover rounded mb-2"
              />
              <p className="font-bold truncate">{a.nombre}</p>
              <p className="text-sm text-gray-600 truncate">{a.departamento || "Sin departamento"}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm">{a.hora}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  a.estado === "Temprano" ? "bg-green-100 text-green-700" :
                  a.estado === "Tarde" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {a.estado}
                </span>
              </div>
            </div>
          ))}
          
          {filtradas.length === 0 && (
            <div className="flex-shrink-0 w-full py-8 text-center text-gray-500">
              No hay registros de asistencia hoy
            </div>
          )}
        </div>
      </div>
    </div>
  );
}