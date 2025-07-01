import { useEffect, useState } from "react";
import { FaUserCheck, FaUsers, FaClock, FaExclamationTriangle, FaRobot } from "react-icons/fa";
import api from "../api/api";

export default function GenerarModelo() {
  const [estado, setEstado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const cargarEstado = async () => {
    try {
      const res = await api.get("/personas/estado_modelo");
      setEstado(res.data);
    } catch (err) {
      console.error("❌ Error al obtener estado del modelo:", err);
    }
  };

  useEffect(() => {
    cargarEstado();
  }, []);

  const generarModelo = async () => {
    setGenerando(true);
    setError("");

    try {
      const res = await api.post("/personas/registrar_modelo");
      alert("✅ " + res.data.mensaje);
      setModalVisible(false);
      cargarEstado();
    } catch (err) {
      console.error("❌ Error al generar modelo:", err);
      setError(err.response?.data?.detail || "Error al generar modelo");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="relative">
      <h2 className="text-3xl font-bold mb-6 text-[#2C2F4A]">⚙️ Estado para Generar Modelo</h2>

      {estado ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4 border-l-4 border-blue-400">
            <FaUsers className="text-4xl text-blue-500" />
            <div>
              <p className="text-gray-600">Total de personas</p>
              <p className="text-xl font-bold text-[#2C2F4A]">{estado.total}</p>
            </div>
          </div>

          <div className={`bg-white p-4 rounded-lg shadow flex items-center gap-4 border-l-4 ${estado.total === estado.mejoradas ? "border-green-400" : "border-yellow-400"}`}>
            <FaUserCheck className="text-4xl text-green-500" />
            <div>
              <p className="text-gray-600">Con imagen optimizada</p>
              <p className="text-xl font-bold text-[#2C2F4A]">
                {estado.mejoradas} / {estado.total}{" "}
                <span className={`ml-2 text-sm font-semibold ${estado.total === estado.mejoradas ? "text-green-600" : "text-yellow-600"}`}>
                  {estado.total === estado.mejoradas ? "✔️ Listo óptimo" : "⛔ Faltan imágenes"}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4 border-l-4 border-purple-400">
            <FaClock className="text-4xl text-purple-500" />
            <div>
              <p className="text-gray-600">Última generación</p>
              <p className="text-xl font-bold text-[#2C2F4A]">
                {estado.ultima_fecha || "Nunca"}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow flex items-center gap-4 border-l-4 border-yellow-400 col-span-full md:col-span-2 xl:col-span-1">
            <FaExclamationTriangle className="text-4xl text-yellow-500" />
            <div>
              <p className="text-gray-600">Similitudes faciales</p>
              <p className="text-xl font-bold text-[#2C2F4A]">
                {estado.hay_similares ? "¡Sí, revisar!" : "No detectado"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-600">Cargando estado...</p>
      )}

      {/* Botón */}
      <div className="text-center">
        <button
          onClick={() => setModalVisible(true)}
          disabled={!estado || estado.total !== estado.mejoradas}
          className={`px-6 py-3 rounded-lg text-white text-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all
            ${estado && estado.total === estado.mejoradas
              ? "bg-gradient-to-r from-[#2D3C74] to-[#402D53] hover:brightness-110"
              : "bg-gray-400 cursor-not-allowed"}
          `}
        >
          <FaRobot /> Generar Modelo
        </button>
        {estado && estado.total !== estado.mejoradas && (
          <p className="text-sm mt-2 text-red-600 font-semibold">
            ⚠️ Faltan imágenes optimizadas. Mejora todas antes de continuar.
          </p>
        )}
      </div>

      {/* Modal de confirmación */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-md relative">
            <button
              onClick={() => setModalVisible(false)}
              className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-500"
            >
              ✖
            </button>
            <h3 className="text-2xl font-bold text-[#2C2F4A] mb-4">¿Confirmar generación?</h3>
            <p className="text-gray-700 mb-4">
              Estás a punto de generar un nuevo modelo con las personas optimizadas. ¿Deseas continuar?
            </p>
            {error && (
              <p className="text-red-600 font-semibold mb-3">{error}</p>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setModalVisible(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={generarModelo}
                disabled={generando}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold"
              >
                {generando ? "Generando..." : "Sí, generar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
