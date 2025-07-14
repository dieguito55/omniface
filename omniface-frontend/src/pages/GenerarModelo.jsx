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
  FaSpinner,
  FaMagic,
  FaCheckCircle,
  FaInfoCircle
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
    if (!state.status) return (
      <div className="flex justify-center py-10">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-16 bg-gradient-to-r from-[#a0c4ff] to-[#8cc1ff] rounded-lg"></div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        <StatusCard 
          icon={<FaUsers className="text-[#3b2f5e]" size={24} />}
          title="Total de personas"
          value={state.status.total}
          color="primary"
          description="Personas registradas en el sistema"
        />
        <StatusCard
          icon={<FaUserCheck className={
            state.status.total === state.status.mejoradas ? 
            "text-green-500" : "text-yellow-500"
          } size={24} />}
          title="Imágenes optimizadas"
          value={`${state.status.mejoradas} / ${state.status.total}`}
          color={state.status.total === state.status.mejoradas ? "success" : "warning"}
          extra={state.status.total === state.status.mejoradas ? 
            <span className="flex items-center text-green-600 text-sm mt-1">
              <FaCheckCircle className="mr-1" /> Listo para entrenar
            </span> : 
            <span className="flex items-center text-yellow-600 text-sm mt-1">
              <FaExclamationTriangle className="mr-1" /> Faltan optimizar imágenes
            </span>
          }
          description="Imágenes preparadas para el modelo"
        />
        <StatusCard
          icon={<FaClock className="text-[#3b2f5e]" size={24} />}
          title="Última generación"
          value={state.status.ultima_fecha ? new Date(state.status.ultima_fecha).toLocaleString() : "Nunca"}
          color="primary"
          description="Fecha del último entrenamiento"
        />
        <StatusCard
          icon={<FaCamera className={
            state.status.ultima_fecha ? "text-green-500" : "text-gray-400"
          } size={24} />}
          title="Estado del modelo"
          value={state.status.ultima_fecha ? "Activo y listo" : "No entrenado"}
          color={state.status.ultima_fecha ? "success" : "gray"}
          extra={
            state.status.ultima_fecha ? (
              <motion.button 
                onClick={navigateToRecognition}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="text-sm font-semibold mt-2 bg-[#3b2f5e] text-white px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-[#1e2c4a] transition-colors"
              >
                Probar reconocimiento <FaMagic className="ml-1" />
              </motion.button>
            ) : (
              <span className="text-xs text-gray-500">
                Entrena el modelo primero
              </span>
            )
          }
          description="Estado del reconocimiento facial"
        />
      </div>
    );
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header con gradiente y sombra */}
      <div className="flex justify-between items-center mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-gradient-to-br from-[#3b2f5e] to-[#1e2c4a] shadow-lg">
            <FaCogs className="text-white text-2xl" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#1e2c4a]">
              Entrenamiento del Modelo Facial
            </h2>
            <p className="text-[#3b2f5e] opacity-80">Prepara y entrena el sistema de reconocimiento</p>
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleDashboard}
          title={state.showDashboard ? "Ocultar dashboard" : "Mostrar dashboard"}
          className="p-3 rounded-full bg-gradient-to-br from-[#3b2f5e] to-[#1e2c4a] text-white shadow-lg hover:shadow-xl transition-all"
        >
          <FaChartBar className="text-xl" />
        </motion.button>
      </div>

      {/* Tarjetas de estado */}
      {renderStatusCards()}

      {/* Sección de acción principal */}
      <div className="bg-gradient-to-r from-[#f8faff] to-[#e6f0ff] p-6 rounded-xl shadow-sm mb-10">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-semibold text-[#1e2c4a] mb-3 flex items-center justify-center gap-2">
            <FaRobot className="text-[#3b2f5e]" /> Entrenar Modelo de Reconocimiento
          </h3>
          <p className="text-[#3b2f5e] mb-6">
            Genera un nuevo modelo con todas las personas registradas. Este proceso analizará 
            todas las imágenes y creará patrones para el reconocimiento facial.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(59, 47, 94, 0.3)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setState(prev => ({ ...prev, modalVisible: true }))}
            disabled={!state.status || state.status.total !== state.status.mejoradas}
            className={`px-8 py-4 rounded-xl text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-all mx-auto
              ${state.status && state.status.total === state.status.mejoradas
                ? "bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] hover:from-[#1e2c4a] hover:to-[#3b2f5e]"
                : "bg-gray-300 cursor-not-allowed"}`}
          >
            {state.status && state.status.total !== state.status.mejoradas ? (
              <>
                <FaExclamationTriangle /> Optimiza las imágenes primero
              </>
            ) : (
              <>
                <FaRobot /> Iniciar Entrenamiento
              </>
            )}
          </motion.button>
          
          {state.status && state.status.total !== state.status.mejoradas && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-yellow-700 text-sm flex items-start gap-2 max-w-md mx-auto">
              <FaInfoCircle className="mt-0.5 flex-shrink-0" />
              <p>Debes optimizar todas las imágenes antes de poder entrenar el modelo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dashboard de analytics */}
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

      {/* Modales */}
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

function StatusCard({ icon, title, value, color, extra, description }) {
  const colorMap = {
    primary: "from-[#a0c4ff] to-[#8cc1ff] border-[#7fb3ff]",
    success: "from-green-100 to-green-50 border-green-200",
    warning: "from-yellow-100 to-yellow-50 border-yellow-200",
    gray: "from-gray-100 to-gray-50 border-gray-200"
  };

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
      className={`bg-gradient-to-b ${colorMap[color]} p-5 rounded-xl border-l-4 shadow-sm h-full flex flex-col`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-white shadow-sm flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-[#1e2c4a] opacity-80">{title}</h3>
          <p className="text-2xl font-bold text-[#1e2c4a] mt-1">{value}</p>
          {description && (
            <p className="text-xs text-[#3b2f5e] opacity-70 mt-1">{description}</p>
          )}
          {extra && (
            <div className="mt-2">
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
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a]"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-[#1e2c4a]">Confirmar entrenamiento</h3>
              <p className="text-sm text-[#3b2f5e] opacity-70">Proceso de generación del modelo</p>
            </div>
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
              Este proceso puede tardar varios minutos dependiendo del número de personas.
            </p>
            
            <div className="flex items-start gap-3 p-3 bg-[#f0f6ff] rounded-lg border border-[#d6e4ff]">
              <FaInfoCircle className="text-[#3b2f5e] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-[#1e2c4a] font-medium">¿Qué sucederá?</p>
                <p className="text-xs text-[#3b2f5e] mt-1">
                  Se analizarán todas las imágenes, se extraerán características faciales 
                  y se crearán los patrones para el reconocimiento.
                </p>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-600 flex items-start gap-2">
                <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium transition-colors"
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={generating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                generating 
                  ? "bg-[#91baff] text-white cursor-wait" 
                  : "bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] text-white hover:from-[#1e2c4a] hover:to-[#3b2f5e]"
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <FaSpinner className="animate-spin" /> Generando...
                </span>
              ) : "Iniciar Entrenamiento"}
            </motion.button>
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

  const clusterColors = ["#3b2f5e", "#1e2c4a", "#7fb3ff", "#91baff", "#a0c4ff"];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#e6f0ff]"
    >
      {/* Encabezado con gradiente */}
      <div className="bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] p-5 text-white">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-3">
              <FaChartBar /> Dashboard de Análisis
            </h3>
            <p className="text-sm opacity-80 mt-1">Visualización de datos del modelo facial</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => downloadCSV(neighborsCSV, "vecinos.csv")}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm border border-white/20"
            >
              <FaDownload size={14} /> Exportar Vecinos
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => downloadCSV(tsneCSV, "tsne_coords.csv")}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm border border-white/20"
            >
              <FaDownload size={14} /> Exportar Coordenadas
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-[#e6f0ff]">
        <MetricCard 
          icon={<FaUsers className="text-[#3b2f5e]" size={18} />}
          label="Personas analizadas"
          value={data.stats.personas}
          color="primary"
        />
        <MetricCard
          icon={<FaExclamationTriangle className="text-yellow-500" size={18} />}
          label="Imágenes rechazadas"
          value={data.stats.rechazados}
          color="warning"
        />
        <MetricCard
          icon={<FaCogs className="text-[#1e2c4a]" size={18} />}
          label="Dimensión del modelo"
          value={data.stats.dimension}
          color="primary-dark"
        />
        <MetricCard
          icon={<FaDatabase className="text-[#7fb3ff]" size={18} />}
          label="Grupos identificados"
          value={data.stats.clusters}
          color="accent"
        />
      </div>

      {/* Contenido del dashboard */}
      <div className="p-5">
        {/* Visualización t-SNE */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-[#1e2c4a]">Mapa de Características</h4>
            <span className="text-sm text-[#3b2f5e] opacity-70">Visualización t-SNE 2D</span>
          </div>
          
          <div className="bg-[#f8faff] rounded-lg p-4 border border-[#e6f0ff] shadow-sm">
            <div className="mb-3 flex flex-wrap gap-2">
              {clusterColors.map((color, i) => (
                <div key={i} className="flex items-center text-xs">
                  <div 
                    className="w-3 h-3 rounded-full mr-1" 
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-[#3b2f5e] opacity-80">Grupo {i+1}</span>
                </div>
              ))}
            </div>
            
            <Plot
              data={[{
                x: data.tsne.map(p => p.x),
                y: data.tsne.map(p => p.y),
                text: data.tsne.map(p => p.nombre),
                mode: "markers",
                type: "scatter",
                marker: {
                  color: data.tsne.map(p => clusterColors[p.cluster % clusterColors.length]),
                  size: 14,
                  line: { width: 1, color: 'white' },
                  opacity: 0.8
                },
                hoverinfo: "text",
                hoverlabel: { 
                  bgcolor: "white", 
                  font: { color: "black", size: 12 },
                  bordercolor: "#e6f0ff"
                }
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
              config={{ 
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['toImage', 'sendDataToCloud'],
                modeBarButtonsToAdd: [{
                  name: 'Descargar SVG',
                  icon: Plotly.Icons.camera,
                  click: (gd) => {
                    Plotly.downloadImage(gd, {
                      format: 'svg',
                      width: 800,
                      height: 600,
                      filename: 'tsne_visualization'
                    });
                  }
                }]
              }}
              style={{ width: "100%" }}
            />
          </div>
          
          <p className="text-xs text-[#3b2f5e] opacity-70 mt-2 text-center">
            Cada punto representa una persona. Los puntos cercanos tienen características faciales similares.
          </p>
        </div>

        {/* Tabla de vecinos más cercanos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-[#1e2c4a]">Similitudes Faciales</h4>
            <span className="text-sm text-[#3b2f5e] opacity-70">Personas más parecidas</span>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-[#e6f0ff] shadow-sm">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-[#e6f0ff]">
                <thead className="bg-[#f8faff]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#3b2f5e] uppercase tracking-wider">
                      Persona
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#3b2f5e] uppercase tracking-wider">
                      Persona Similar
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#3b2f5e] uppercase tracking-wider">
                      Nivel de Similitud
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#e6f0ff]">
                  {data.vecinos.map((v, i) => (
                    <tr key={i} className="hover:bg-[#f8faff] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#1e2c4a]">
                        {v.persona}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#3b2f5e]">
                        {v.vecino}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-[#f0f6ff] text-[#1e2c4a]">
                          {v.similitud.toFixed(4)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="text-xs text-[#3b2f5e] opacity-70 mt-2">
            Muestra las personas que el modelo considera más similares entre sí (valores cercanos a 1 indican mayor similitud).
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon, label, value, color }) {
  const colorMap = {
    "primary": "bg-[#f0f6ff] text-[#1e2c4a]",
    "primary-dark": "bg-[#e6f0ff] text-[#1e2c4a]",
    "accent": "bg-[#e6f0ff] text-[#3b2f5e]",
    "warning": "bg-yellow-50 text-yellow-700"
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`p-3 rounded-lg flex items-center gap-3 ${colorMap[color]} border border-[#e6f0ff] shadow-sm`}
    >
      <div className="p-2 rounded-md bg-white shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs font-medium opacity-80">{label}</div>
      </div>
    </motion.div>
  );
}