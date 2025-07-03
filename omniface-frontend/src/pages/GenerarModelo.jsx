// omniface-frontend/src/pages/GenerarModelo.jsx
import { useEffect, useState } from "react";
import {
  FaUserCheck, FaUsers, FaClock, FaExclamationTriangle,
  FaRobot, FaBug
} from "react-icons/fa";
import api from "../api/api";

export default function GenerarModelo() {
  const [estado, setEstado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  // 🆕  resumen del modelo recién generado
  const [ultimoModelo, setUltimoModelo] = useState(null);
  // 🆕  errores detallados
  const [listaErrores, setListaErrores] = useState([]);

  /* ───────────────────────────────────────────── */
  const cargarEstado = async () => {
    try {
      const res = await api.get("/personas/estado_modelo");
      setEstado(res.data);
    } catch (err) {
      console.error("❌ Error al obtener estado del modelo:", err);
    }
  };
  useEffect(() => { cargarEstado(); }, []);
  /* ───────────────────────────────────────────── */

  const generarModelo = async () => {
    setGenerando(true);
    setError("");
    try {
      const res = await api.post("/personas/registrar_modelo");
      alert("✅ " + res.data.mensaje);
      setUltimoModelo(res.data.modelo);           // 🆕  guarda resumen
      setModalVisible(false);
      setListaErrores([]);                        // limpia errores previos
      cargarEstado();                             // refresca contadores
    } catch (err) {
      console.error("❌ Error al generar modelo:", err);
      setError(err.response?.data?.detail || "Error al generar modelo");
    } finally {
      setGenerando(false);
    }
  };

  /* 🆕  Obtener errores para el último modelo */
  const traerErrores = async () => {
    try {
      const res = await api.get("/personas/errores_modelo");
      setListaErrores(res.data.errores);
    } catch (err) {
      console.error("⚠️ No se pudieron cargar errores:", err);
      alert("No se encontró el archivo de errores.");
    }
  };

  return (
    <div className="relative">
      <h2 className="text-3xl font-bold mb-6 text-[#2C2F4A]">
        ⚙️ Estado para Generar Modelo
      </h2>

      {/* ───────────── Tarjetas de estado ───────────── */}
      {estado ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
          {/* total personas */}
          <Tarjeta
            Icon={FaUsers}
            color="blue"
            titulo="Total de personas"
            valor={estado.total}
          />
          {/* optimizadas */}
          <Tarjeta
            Icon={FaUserCheck}
            color={estado.total === estado.mejoradas ? "green" : "yellow"}
            titulo="Con imagen optimizada"
            valor={`${estado.mejoradas} / ${estado.total}`}
            extra={estado.total === estado.mejoradas ? "✔️ Listo óptimo" : "⛔ Faltan imágenes"}
          />
          {/* última generación */}
          <Tarjeta
            Icon={FaClock}
            color="purple"
            titulo="Última generación"
            valor={estado.ultima_fecha || "Nunca"}
          />
          {/* similitudes (placeholder) */}
          <Tarjeta
            Icon={FaExclamationTriangle}
            color="yellow"
            titulo="Similitudes faciales"
            valor={estado.hay_similares ? "¡Sí, revisar!" : "No detectado"}
          />
        </div>
      ) : (
        <p className="text-gray-600">Cargando estado...</p>
      )}

      {/* ───────────── Botones ───────────── */}
      <div className="flex flex-col items-center gap-4">
        {/* Generar */}
        <button
          onClick={() => setModalVisible(true)}
          disabled={!estado || estado.total !== estado.mejoradas}
          className={`px-6 py-3 rounded-lg text-white text-lg font-bold flex items-center gap-2 shadow-lg transition-all
            ${estado && estado.total === estado.mejoradas
              ? "bg-gradient-to-r from-[#2D3C74] to-[#402D53] hover:brightness-110"
              : "bg-gray-400 cursor-not-allowed"}`}
        >
          <FaRobot /> Generar Modelo
        </button>

        {/* 🆕  Ver errores si existen */}
        {ultimoModelo && (
          <button
            onClick={traerErrores}
            className="flex items-center gap-2 text-sm text-blue-700 hover:underline"
          >
            <FaBug /> Ver errores de la última ejecución
          </button>
        )}
        
      </div>

      {/* 🆕  Lista de errores */}
      {listaErrores.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3 text-[#2C2F4A]">
            Imágenes descartadas&nbsp;
            <span className="text-sm text-gray-500">
              ({listaErrores.length})
            </span>
          </h3>
          <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {listaErrores.map((e, i) => (
              <li key={i} className="bg-red-50 border-l-4 border-red-400 p-2 text-sm rounded">
                <strong>{e.nombre || "sin-nombre"}</strong> — {e.error}
                {e.norma && <> &nbsp;• norma={e.norma.toFixed?.(2)}</>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ───────────── Modal de confirmación ───────────── */}
      {modalVisible && (
        <ModalConfirmar
          onCancelar={() => setModalVisible(false)}
          onConfirmar={generarModelo}
          generando={generando}
          error={error}
        />
      )}
    </div>
  );
}

/* ═════════ COMPONENTES AUX ═════════ */

function Tarjeta({ Icon, color, titulo, valor, extra }) {
  const colores = {
    blue:   "blue-400",
    green:  "green-400",
    yellow: "yellow-400",
    purple: "purple-400"
  };
  return (
    <div className={`bg-white p-4 rounded-lg shadow flex items-center gap-4 border-l-4 border-${colores[color]}`}>
      <Icon className={`text-4xl text-${color}-500`} />
      <div>
        <p className="text-gray-600">{titulo}</p>
        <p className="text-xl font-bold text-[#2C2F4A]">{valor}</p>
        {extra && (
          <span className={`text-sm font-semibold ${color === "green" ? "text-green-600" : "text-yellow-600"}`}>
            {extra}
          </span>
        )}
      </div>
    </div>
  );
}

function ModalConfirmar({ onCancelar, onConfirmar, generando, error }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] max-w-md relative">
        <button
          onClick={onCancelar}
          className="absolute top-2 right-3 text-xl text-gray-500 hover:text-red-500"
        >
          ✖
        </button>

        <h3 className="text-2xl font-bold text-[#2C2F4A] mb-4">
          ¿Confirmar generación?
        </h3>
        <p className="text-gray-700 mb-4">
          Estás a punto de generar un nuevo modelo con las personas optimizadas.
          ¿Deseas continuar?
        </p>

        {error && <p className="text-red-600 font-semibold mb-3">{error}</p>}

        <div className="flex justify-end gap-4">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={generando}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          >
            {generando ? "Generando..." : "Sí, generar"}
          </button>
        </div>
      </div>
    </div>
  );
}
