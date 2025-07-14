import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiRefreshCw, FiRotateCcw, FiRotateCw, FiSettings, FiCamera, FiLayout } from "react-icons/fi";
import api from "../api/api.js";
import ReconCamInner from "../components/ReconCamInner";
import AsistenciasHoy from "../components/AsistenciasHoy";
import SalidasHoy from "../components/SalidasHoy";
import { useGlobalRecon } from "../context/GlobalReconContext";
import { useRecon } from "../context/ReconContext";

export default function ReconocimientoFacial() {
  const { numCamaras, setNumCamaras, modo, setModo, camSelections, setCamSelections } = useGlobalRecon();
  const [cams, setCams] = useState(() => {
    const cached = localStorage.getItem("cachedCameras");
    return cached ? JSON.parse(cached) : [];
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!cams.length) {
      loadCameras(false);
    }
  }, []);

  const loadCameras = async (force = false) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/recon/camaras?force=${force}`);
      setCams(response.data.camaras);
      localStorage.setItem("cachedCameras", JSON.stringify(response.data.camaras));
    } catch (error) {
      console.error("Error loading cameras:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const reloadModel = async () => {
    const token = localStorage.getItem("access_token")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      console.error("Token no encontrado");
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await api.get(`/recon/reload_model?token=${token}`);
      console.log(response.data.mensaje);
      // Mostrar notificación de éxito
    } catch (error) {
      console.error("Error recargando modelo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const reloadCameras = async () => {
    localStorage.removeItem("cachedCameras");
    await loadCameras(true);
  };

  const handleCamSelect = (index, value) => {
    const newSelections = [...camSelections];
    newSelections[index] = parseInt(value);
    setCamSelections(newSelections);
  };

  const rotateCCW = () => {
    setCamSelections([camSelections[2], camSelections[0], camSelections[1]]);
  };

  const rotateCW = () => {
    setCamSelections([camSelections[1], camSelections[2], camSelections[0]]);
  };

  const renderCamera = (i) => {
    const { data } = useRecon(camSelections[i]);
    return (
      <div className="relative w-full aspect-[16/9] rounded-xl bg-gray-900 shadow-xl overflow-hidden border border-gray-700/50">
        {/* Camera Selector */}
        <div className="absolute right-3 top-3 z-10">
          <div className="relative">
            <select
              value={camSelections[i]}
              onChange={(e) => handleCamSelect(i, e.target.value)}
              className="appearance-none rounded-lg border-gray-600 bg-gray-800 px-3 py-1.5 pr-8 text-sm text-white focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
              disabled={data.connected}
            >
              {cams.map((c) => (
                <option key={c.id} value={c.id} className="bg-gray-800">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <FiCamera className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Rotation Buttons for small cameras */}
        {numCamaras === 3 && i === 1 && (
          <button
            onClick={rotateCCW}
            className="absolute left-[-18px] top-1/2 z-20 -translate-y-1/2 bg-gray-800 text-blue-400 p-2 rounded-full shadow-lg hover:bg-gray-700 hover:text-blue-300 hover:scale-110 transition-all duration-300 border border-gray-700"
            title="Girar antihorario"
          >
            <FiRotateCcw className="h-4 w-4" />
          </button>
        )}
        {numCamaras === 3 && i === 2 && (
          <button
            onClick={rotateCW}
            className="absolute left-[-18px] top-1/2 z-20 -translate-y-1/2 bg-gray-800 text-blue-400 p-2 rounded-full shadow-lg hover:bg-gray-700 hover:text-blue-300 hover:scale-110 transition-all duration-300 border border-gray-700"
            title="Girar horario"
          >
            <FiRotateCw className="h-4 w-4" />
          </button>
        )}

        {/* Animated Camera Inner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={camSelections[i]}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <ReconCamInner camId={camSelections[i]} modo={modo} />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  let cameraLayout;
  if (numCamaras === 1) {
    cameraLayout = (
      <div className="grid gap-4 grid-cols-1 place-items-center w-full">
        {renderCamera(0)}
      </div>
    );
  } else if (numCamaras === 2) {
    cameraLayout = (
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 w-full">
        {renderCamera(0)}
        {renderCamera(1)}
      </div>
    );
  } else if (numCamaras === 3) {
    cameraLayout = (
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[2fr_1fr] lg:grid-rows-2 w-full lg:[&>:first-child]:row-span-2">
        {renderCamera(0)}
        {renderCamera(1)}
        {renderCamera(2)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
      {/* Control Panel - Rediseñado profesional */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-800 p-4 shadow-lg border border-gray-700/50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiSettings className="text-blue-400" />
            <span>Panel de Control</span>
          </h2>
          
          <div className="flex items-center gap-2">
            <FiLayout className="text-gray-400" />
            <select
              value={numCamaras}
              onChange={(e) => setNumCamaras(parseInt(e.target.value))}
              className="rounded-lg border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value={1} className="bg-gray-800">1 Cámara</option>
              <option value={2} className="bg-gray-800">2 Cámaras</option>
              <option value={3} className="bg-gray-800">3 Cámaras</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <FiCamera className="text-gray-400" />
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value)}
              className="rounded-lg border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="asistencia" className="bg-gray-800">Modo Asistencia</option>
              <option value="normal" className="bg-gray-800">Modo Normal</option>
              <option value="salida" className="bg-gray-800">Modo Salida</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={reloadModel}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recargar Modelo</span>
          </button>
          
          <button
            onClick={reloadCameras}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recargar Cámaras</span>
          </button>
        </div>
      </div>

      {/* Camera Layout */}
      {cameraLayout}

      {/* Mode-Specific Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={modo}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {modo === "asistencia" && (
            <div className="overflow-hidden rounded-xl bg-gray-800 shadow-lg border border-gray-700/50">
              <AsistenciasHoy />
            </div>
          )}
          {modo === "salida" && (
            <div className="overflow-hidden rounded-xl bg-gray-800 shadow-lg border border-gray-700/50">
              <SalidasHoy />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}