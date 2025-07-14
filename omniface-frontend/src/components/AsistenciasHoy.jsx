import { useEffect, useState } from "react";
import api from "../api/api";
import { FaSearch, FaUserClock, FaUserCheck, FaUserTimes } from "react-icons/fa";

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
    <div className="w-full flex flex-col bg-gradient-to-br from-white to-[#f5f9ff] rounded-xl shadow-lg p-6 border border-[#91baff]/30">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#1e2c4a] p-2 rounded-lg text-white">
            <FaUserClock size={20} />
          </div>
          <h2 className="text-2xl font-bold text-[#1e2c4a]">Asistencias del Día</h2>
        </div>
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3b2f5e]/50">
            <FaSearch />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-[#91baff]/50 rounded-lg focus:border-[#7fb3ff] focus:ring-2 focus:ring-[#a0c4ff]/30 bg-white/90 shadow-sm"
          />
        </div>
      </div>
      
      <div className="relative">
        <div className="flex space-x-4 pb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-[#91baff] scrollbar-track-[#f0f6ff] hover:scrollbar-thumb-[#7fb3ff]">
          {filtradas.map((a, i) => (
            <div key={i} className="flex-shrink-0 w-60 p-4 border border-[#91baff]/30 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="relative">
                <img
                  src={`http://localhost:8000/${a.foto_path}`}
                  alt={a.nombre}
                  className="w-full h-44 object-cover rounded-lg mb-3 border border-[#91baff]/20"
                />
                <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-semibold shadow ${
                  a.estado === "Temprano" ? "bg-green-100 text-green-700" :
                  a.estado === "Tarde" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {a.estado === "Temprano" ? <FaUserCheck className="inline mr-1" /> : 
                   a.estado === "Tarde" ? <FaUserClock className="inline mr-1" /> : 
                   <FaUserTimes className="inline mr-1" />}
                  {a.estado}
                </div>
              </div>
              <p className="font-bold text-[#1e2c4a] truncate">{a.nombre}</p>
              <p className="text-sm text-[#3b2f5e]/80 truncate">{a.departamento || "Sin departamento"}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-[#3b2f5e]/70">{a.hora}</span>
                <span className="text-xs px-2 py-1 rounded bg-[#1e2c4a]/10 text-[#1e2c4a]">
                  Asistencia
                </span>
              </div>
            </div>
          ))}
          
          {filtradas.length === 0 && (
            <div className="flex-shrink-0 w-full py-10 text-center text-[#3b2f5e]/60 bg-[#f8faff] rounded-xl border-2 border-dashed border-[#91baff]/30">
              <FaUserTimes className="mx-auto text-3xl mb-2 text-[#91baff]" />
              No hay registros de asistencia hoy
            </div>
          )}
        </div>
      </div>
    </div>
  );
}