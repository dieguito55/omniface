// omniface-frontend/src/pages/Notificacion.jsx
import { useEffect, useState } from "react";
import { FaExclamationCircle } from "react-icons/fa";
import api from "../api/api";

export default function Notificacion() {
  const [pendientes, setPendientes] = useState([]);

  useEffect(() => {
    const cargarPendientes = async () => {
      try {
        const res = await api.get("/personas/listar");
        const noMejoradas = res.data.personas.filter(p => !p.imagen_mejorada_listo);
        setPendientes(noMejoradas);
      } catch (err) {
        console.error("❌ Error al cargar pendientes:", err);
      }
    };
    cargarPendientes();
  }, []);

  return (
    <div className="bg-gradient-to-br from-[#F9FAFB] via-white to-[#EFF3F9] min-h-[80vh] rounded-xl shadow-xl p-6">
      <h2 className="text-3xl font-extrabold text-[#2C2F4A] mb-6">🔔 Notificaciones pendientes</h2>

      {pendientes.length === 0 ? (
        <div className="text-gray-600 text-lg">🎉 No hay notificaciones pendientes.</div>
      ) : (
        <ul className="space-y-4">
          {pendientes.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-4 p-4 border-l-4 border-blue-400 bg-white rounded-lg shadow-sm hover:shadow-md transition duration-300"
            >
              <div className="text-blue-500 mt-1">
                <FaExclamationCircle className="text-xl" />
              </div>
              <div>
                <p className="text-[#2C2F4A] font-medium">
                  Persona <span className="font-bold text-[#402D53]">{p.nombre_completo}</span> aún no tiene imagen optimizada.
                </p>
                <p className="text-sm text-gray-500">Asegúrate de mejorar su imagen para incluirla en el modelo.</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
