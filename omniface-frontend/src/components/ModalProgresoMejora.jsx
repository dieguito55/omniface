// omniface-frontend/src/components/ModalProgresoMejora.jsx
import { useState, useEffect } from "react";
import { FaCheckCircle, FaSpinner, FaTimes, FaImage } from "react-icons/fa";
import { motion } from "framer-motion";

export default function ModalProgresoMejora({ lista, onCompletar }) {
  const [procesando, setProcesando] = useState(0);
  const [estado, setEstado] = useState(lista.map(() => "pendiente"));
  const [tiempoEstimado, setTiempoEstimado] = useState(0);
  const progreso = Math.round((estado.filter(e => e === "listo").length / lista.length) * 100);

  useEffect(() => {
    if (lista.length === 0) return;

    // Calcular tiempo estimado (1.5 segundos por imagen)
    setTiempoEstimado(Math.round(lista.length * 1.5));

    const procesarImagen = async (i) => {
      if (i >= lista.length) {
        setTimeout(onCompletar, 1000); // Espera antes de cerrar
        return;
      }

      setProcesando(i);
      setEstado(prev => {
        const nuevo = [...prev];
        nuevo[i] = "procesando";
        return nuevo;
      });

      // Actualizar tiempo estimado restante
      setTiempoEstimado(prev => Math.max(0, prev - 1.5));

      await new Promise(res => setTimeout(res, 1500)); // Simula tiempo de mejora

      setEstado(prev => {
        const nuevo = [...prev];
        nuevo[i] = "listo";
        return nuevo;
      });

      procesarImagen(i + 1);
    };

    procesarImagen(0);
  }, [lista]);

  // Función para formatear segundos a minutos:segundos
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4"
    >
      <motion.div 
        initial={{ y: 20, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        className="bg-gradient-to-br from-[#1e2c4a] to-[#3b2f5e] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[#7fb3ff]/20"
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center p-4 border-b border-[#7fb3ff]/10">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FaImage className="text-[#a0c4ff]" />
            Proceso de Mejora de Imágenes
          </h3>
          <button 
            onClick={onCompletar} 
            className="text-gray-300 hover:text-white p-1"
            disabled={progreso < 100}
          >
            <FaTimes />
          </button>
        </div>

        {/* Contenido principal */}
        <div className="p-6">
          {/* Barra de progreso superior */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[#a0c4ff]">
                Progreso: {progreso}%
              </span>
              <span className="text-xs text-gray-400">
                {estado.filter(e => e === "listo").length} de {lista.length} completadas
              </span>
            </div>
            <div className="w-full bg-[#2c3d6e] rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-[#7fb3ff] to-[#a0c4ff] h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progreso}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Tiempo estimado: {formatTime(tiempoEstimado)}</span>
              <span>{procesando + 1}/{lista.length} procesando ahora</span>
            </div>
          </div>

          {/* Lista de imágenes */}
          <div className="bg-[#1e2c4a]/50 rounded-lg border border-[#7fb3ff]/10 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#1e2c4a] text-sm text-[#a0c4ff]">
                  <tr>
                    <th className="px-4 py-2 text-left">Imagen</th>
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7fb3ff]/10">
                  {lista.map((img, i) => (
                    <tr 
                      key={i} 
                      className={`transition-colors ${
                        estado[i] === "procesando" ? "bg-[#7fb3ff]/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <img
                            src={`http://192.168.0.105:8000/imagenes_originales/${img}`}
                            alt="preview"
                            className="h-10 w-10 object-cover rounded-lg border border-[#7fb3ff]/20"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-200">
                        <div className="truncate max-w-xs">{img}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {estado[i] === "procesando" ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="inline-block"
                          >
                            <FaSpinner className="text-[#7fb3ff] text-base" />
                          </motion.div>
                        ) : estado[i] === "listo" ? (
                          <div className="flex items-center justify-center gap-1">
                            <FaCheckCircle className="text-green-400 text-base" />
                            <span className="text-xs text-green-400 hidden md:inline">Listo</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full" />
                            <span className="text-xs text-gray-400 hidden md:inline">Pendiente</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="bg-[#1e2c4a]/70 p-4 border-t border-[#7fb3ff]/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {progreso < 100 ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="text-[#7fb3ff]"
                >
                  <FaSpinner />
                </motion.div>
                <span className="text-sm text-gray-300">Procesando imágenes...</span>
              </>
            ) : (
              <>
                <FaCheckCircle className="text-green-400" />
                <span className="text-sm text-green-400">¡Proceso completado con éxito!</span>
              </>
            )}
          </div>
          <button
            onClick={onCompletar}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              progreso < 100
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-[#7fb3ff] hover:bg-[#91baff] text-[#1e2c4a]"
            }`}
            disabled={progreso < 100}
          >
            {progreso < 100 ? `${progreso}%` : "Finalizar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}