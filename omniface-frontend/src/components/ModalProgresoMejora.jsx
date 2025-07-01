import { useState, useEffect } from "react";
import { FaCheckCircle, FaSpinner } from "react-icons/fa";

export default function ModalProgresoMejora({ lista, onCompletar }) {
  const [procesando, setProcesando] = useState(0);
  const [estado, setEstado] = useState(lista.map(() => "pendiente")); // ["pendiente", "procesando", "listo"]
  const progreso = Math.round((estado.filter(e => e === "listo").length / lista.length) * 100);

  useEffect(() => {
    if (lista.length === 0) return;

    const procesarImagen = async (i) => {
      if (i >= lista.length) {
        setTimeout(onCompletar, 500); // espera un poco antes de cerrar
        return;
      }

      setProcesando(i);
      setEstado((prev) => {
        const nuevo = [...prev];
        nuevo[i] = "procesando";
        return nuevo;
      });

      await new Promise((res) => setTimeout(res, 1000)); // Simula tiempo de mejora

      setEstado((prev) => {
        const nuevo = [...prev];
        nuevo[i] = "listo";
        return nuevo;
      });

      procesarImagen(i + 1);
    };

    procesarImagen(0);
  }, [lista]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
      <div className="bg-[#1E293B] p-6 rounded-xl shadow-lg w-full max-w-xl flex flex-col items-center space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <FaSpinner className="animate-spin text-3xl text-green-400" />
          <h3 className="text-lg font-bold">Mejorando imágenes una por una...</h3>
          <p className="text-sm text-gray-300">{lista.length} imagen(es) en total</p>
          <div className="w-64 bg-gray-700 rounded-full h-3">
            <div
              className="bg-green-400 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            ></div>
          </div>
          <p className="text-sm">{progreso}% completado</p>
        </div>

        <ul className="w-full max-h-60 overflow-y-auto space-y-2">
          {lista.map((img, i) => (
            <li key={i} className="flex items-center gap-4 bg-white/10 rounded-lg px-4 py-2">
              <img
                src={`http://192.168.31.146:8000/imagenes_originales/${img}`}
                alt="preview"
                className="h-10 w-10 object-cover rounded-full border"
              />
              <span className="flex-1 text-sm truncate">{img}</span>
              {estado[i] === "procesando" ? (
                <FaSpinner className="animate-spin text-blue-300 text-base" />
              ) : estado[i] === "listo" ? (
                <FaCheckCircle className="text-green-400 text-base" />
              ) : (
                <div className="w-3 h-3 bg-gray-300 rounded-full" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
