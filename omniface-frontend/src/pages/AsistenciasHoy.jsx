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
    const interval = setInterval(fetchData, 5000); // actualiza cada 5s
    return () => clearInterval(interval);
  }, []);

  const filtradas = asistencias.filter(a =>
  a.nombre?.toLowerCase().includes(filtro.toLowerCase())
);

  return (
    <div className="w-full max-w-sm h-full flex flex-col bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold text-[#2C2F4A] mb-2">Asistencias del Día</h2>
      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        className="p-2 mb-3 border rounded w-full"
      />
      <div className="overflow-y-auto flex-1 space-y-3 pr-2">
        {filtradas.map((a, i) => (
          <div key={i} className="flex items-center gap-3 p-2 border rounded shadow-sm">
            <img
  src={`http://localhost:8000/${a.foto_path}`}  // <- Aquí está el cambio importante
  alt={a.nombre}
  className="w-16 h-16 object-cover rounded"
/>

            <div className="flex-1">
              <p className="font-bold">{a.nombre}</p>
              <p className="text-sm text-gray-600">{a.departamento || "Sin departamento"}</p>
              <div className="flex justify-between text-sm mt-1">
                <span>{a.hora}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  a.estado === "Temprano" ? "bg-green-100 text-green-700" :
                  a.estado === "Tarde" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {a.estado}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-4">No hay registros hoy.</p>
        )}
      </div>
    </div>
  );
}
