// omniface-frontend/src/pages/GenerarModelo.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import {
  FaUserCheck,
  FaUsers,
  FaClock,
  FaExclamationTriangle,
  FaRobot,
  FaBug,
  FaDownload,
  FaChartBar,
  FaCogs,
  FaDatabase,
  FaCamera,
  FaTimes,
  FaSpinner
} from "react-icons/fa";
import Plot from "react-plotly.js";
import api from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ModalProgresoModelo from "../components/ModalProgresoModelo";

export default function GenerarModelo() {
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: null,
    modalVisible: false,
    generating: false,
    error: "",
    analytics: null,
    showDashboard: true,
    progressModal: null,
    backendReady: false
  });

  const pollerRef = useRef(null);
  const lastInitialDate = useRef(null);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get("/personas/estado_modelo");
      setState(prev => ({ ...prev, status: data }));
      return data;
    } catch (e) {
      console.error("❌ estado_modelo:", e);
      return null;
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get("/personas/analitica_modelo");
      setState(prev => ({ ...prev, analytics: data }));
    } catch {
      console.log("Analítica no disponible aún");
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAnalytics();
  }, []);

  const toggleDashboard = () => {
    setState(prev => ({ ...prev, showDashboard: !prev.showDashboard }));
  };

  const navigateToRecognition = () => {
    navigate("/reconocimiento");
  };

  const generateModel = async () => {
    setState(prev => ({ ...prev, generating: true, error: "" }));
    lastInitialDate.current = state.status?.ultima_fecha || null;

    try {
      const { data } = await api.post("/personas/generar_modelo_async");
      setState(prev => ({
        ...prev,
        progressModal: {
          personas: data.personas,
          estimado: data.estimado_segundos
        },
        modalVisible: false,
        generating: false
      }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        error: e.response?.data?.detail || "Error al iniciar proceso",
        generating: false
      }));
    }
  };

  const startPolling = useCallback(() => {
    if (pollerRef.current) return;
    
    pollerRef.current = setInterval(async () => {
      const data = await fetchStatus();
      if (data?.ultima_fecha && data.ultima_fecha !== lastInitialDate.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
        setState(prev => ({ ...prev, backendReady: true }));
      }
    }, 4000);
  }, []);

  const closeProgressModal = async () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    
    await fetchStatus();
    await fetchAnalytics();
    
    setState(prev => ({
      ...prev,
      progressModal: null,
      backendReady: false,
      showDashboard: true
    }));
  };

  const renderStatusCards = () => {
    if (!state.status) return <p className="text-gray-600">Cargando estado…</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <StatusCard 
          icon={<FaUsers className="text-blue-500" />}
          title="Total de personas"
          value={state.status.total}
          color="blue"
        />
        <StatusCard
          icon={<FaUserCheck className={
            state.status.total === state.status.mejoradas ? 
            "text-green-500" : "text-yellow-500"
          } />}
          title="Con imagen optimizada"
          value={`${state.status.mejoradas} / ${state.status.total}`}
          color={state.status.total === state.status.mejoradas ? "green" : "yellow"}
          extra={state.status.total === state.status.mejoradas ? 
            "✔️ Listo óptimo" : "⛔ Faltan imágenes"}
        />
        <StatusCard
          icon={<FaClock className="text-purple-500" />}
          title="Última generación"
          value={state.status.ultima_fecha || "Nunca"}
          color="purple"
        />
        <StatusCard
          icon={<FaCamera className={
            state.status.ultima_fecha ? "text-green-500" : "text-gray-400"
          } />}
          title="Reconocimiento facial"
          value={state.status.ultima_fecha ? "Listo para usar" : "No disponible"}
          color={state.status.ultima_fecha ? "green" : "gray"}
          extra={
            state.status.ultima_fecha ? (
              <button 
                onClick={navigateToRecognition}
                className="text-xs font-semibold mt-1 text-green-600 hover:underline"
              >
                Ir a reconocimiento en vivo →
              </button>
            ) : (
              <span className="text-xs text-gray-500">
                Entrena el modelo primero
              </span>
            )
          }
        />
      </div>
    );
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <FaCogs className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">
            Generación de Modelo Facial
          </h2>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDashboard}
          title={state.showDashboard ? "Ocultar dashboard" : "Mostrar dashboard"}
          className="p-3 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <FaChartBar className="text-xl" />
        </motion.button>
      </div>

      {renderStatusCards()}

      <div className="flex justify-center mb-10">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setState(prev => ({ ...prev, modalVisible: true }))}
          disabled={!state.status || state.status.total !== state.status.mejoradas}
          className={`px-8 py-4 rounded-xl text-white text-lg font-bold flex items-center gap-3 shadow-lg transition-all
            ${state.status && state.status.total === state.status.mejoradas
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              : "bg-gray-400 cursor-not-allowed"}`}
        >
          <FaRobot className="text-xl" /> Generar Nuevo Modelo
        </motion.button>
      </div>

      <AnimatePresence>
        {state.showDashboard && state.analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <EmbeddingsDashboard data={state.analytics} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.modalVisible && (
          <ConfirmationModal
            onCancel={() => setState(prev => ({ ...prev, modalVisible: false }))}
            onConfirm={generateModel}
            generating={state.generating}
            error={state.error}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.progressModal && (
          <ModalProgresoModelo
            personas={state.progressModal.personas}
            estimado={state.progressModal.estimado}
            backendListo={state.backendReady}
            onAnimEnd={startPolling}
            onClose={closeProgressModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusCard({ icon, title, value, color, extra }) {
  const colorMap = {
    blue: "from-blue-100 to-blue-50 border-blue-200",
    green: "from-green-100 to-green-50 border-green-200",
    yellow: "from-yellow-100 to-yellow-50 border-yellow-200",
    purple: "from-purple-100 to-purple-50 border-purple-200",
    gray: "from-gray-100 to-gray-50 border-gray-200"
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`bg-gradient-to-br ${colorMap[color]} p-5 rounded-xl border-l-4 shadow-sm`}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
          {extra && (
            <div className="mt-1">
              {extra}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ConfirmationModal({ onCancel, onConfirm, generating, error }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-2xl font-bold text-gray-800">Confirmar generación</h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Estás a punto de generar un nuevo modelo facial con todas las personas registradas. 
              Este proceso puede tardar varios minutos.
            </p>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <FaDatabase className="text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Se generarán embeddings faciales para cada persona y se indexarán en FAISS.
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-600">
                {error}
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={generating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                generating 
                  ? "bg-indigo-400 text-white cursor-wait" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="animate-spin" /> Generando...
                </span>
              ) : "Confirmar"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function EmbeddingsDashboard({ data }) {
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const neighborsCSV = [
    ["Persona", "Vecino", "Similitud"],
    ...data.vecinos.map(v => [v.persona, v.vecino, v.similitud])
  ].map(r => r.join(",")).join("\n");

  const tsneCSV = [
    ["Nombre", "x", "y", "cluster"],
    ...data.tsne.map(p => [p.nombre, p.x, p.y, p.cluster])
  ].map(r => r.join(",")).join("\n");

  const clusterColors = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#6366f1"];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden"
    >
      <div className="bg-gradient-to-r from-[#1e2c4a] to-[#2d3c74] p-5 text-white">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <FaChartBar /> Dashboard de Embeddings
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => downloadCSV(neighborsCSV, "vecinos.csv")}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm"
            >
              <FaDownload /> Vecinos
            </button>
            <button
              onClick={() => downloadCSV(tsneCSV, "tsne_coords.csv")}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm"
            >
              <FaDownload /> t-SNE
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b">
        <MetricCard 
          icon={<FaUsers className="text-blue-500" />}
          label="Personas"
          value={data.stats.personas}
          color="blue"
        />
        <MetricCard
          icon={<FaExclamationTriangle className="text-yellow-500" />}
          label="Rechazados"
          value={data.stats.rechazados}
          color="yellow"
        />
        <MetricCard
          icon={<FaCogs className="text-purple-500" />}
          label="Dimensión"
          value={data.stats.dimension}
          color="purple"
        />
        <MetricCard
          icon={<FaDatabase className="text-green-500" />}
          label="Clústers"
          value={data.stats.clusters}
          color="green"
        />
      </div>

      <div className="p-5">
        <div className="mb-8">
          <h4 className="text-lg font-semibold mb-3 text-gray-800">Visualización t-SNE</h4>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Plot
              data={[{
                x: data.tsne.map(p => p.x),
                y: data.tsne.map(p => p.y),
                text: data.tsne.map(p => p.nombre),
                mode: "markers",
                type: "scatter",
                marker: {
                  color: data.tsne.map(p => clusterColors[p.cluster % clusterColors.length]),
                  size: 12,
                  line: { width: 0.5, color: 'white' }
                },
                hoverinfo: "text",
                hoverlabel: { bgcolor: "white", font: { color: "black" } }
              }]}
              layout={{
                height: 500,
                margin: { l: 0, r: 0, t: 0, b: 0 },
                xaxis: { showgrid: false, zeroline: false, visible: false },
                yaxis: { showgrid: false, zeroline: false, visible: false },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                hovermode: "closest"
              }}
              config={{ displayModeBar: false }}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-800">Vecinos más cercanos</h4>
          <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Persona
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vecino
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Similitud
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.vecinos.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {v.persona}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {v.vecino}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                        {v.similitud.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon, label, value, color }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    yellow: "text-yellow-600 bg-yellow-50",
    purple: "text-purple-600 bg-purple-50"
  };

  return (
    <div className={`p-3 rounded-lg flex items-center gap-3 ${colorMap[color]}`}>
      <div className="p-2 rounded-md bg-white shadow-sm">
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs font-medium opacity-80">{label}</div>
      </div>
    </div>
  );
}