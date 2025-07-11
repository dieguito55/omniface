import { useEffect, useState } from "react";
import api from "../api/api";

export default function HistorialAsistencia() {
  const [datos, setDatos] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = JSON.parse(atob(token.split('.')[1]));
    const usuario_id = payload.id;

    api.get(`/asistencia/historial/${usuario_id}`)
       .then(r => setDatos(r.data))
       .catch(() => setDatos([]));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4 text-[#2C2F4A]">Historial de Asistencia</h2>
      {datos.length === 0 ? (
        <p className="text-gray-700">No hay registros.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Foto</th>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Departamento</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Hora</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    {d.foto_path && (
                      <img 
                        src={`http://localhost:8000/${d.foto_path}`}
                        alt={d.nombre}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </td>
                  <td className="p-3">{d.nombre}</td>
                  <td className="p-3">{d.departamento || "N/A"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      d.estado === 'Temprano' ? 'bg-green-100 text-green-800' :
                      d.estado === 'Tarde' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {d.estado}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      d.tipo === 'Conocido' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {d.tipo}
                    </span>
                  </td>
                  <td className="p-3">{d.fecha}</td>
                  <td className="p-3">{d.hora}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}