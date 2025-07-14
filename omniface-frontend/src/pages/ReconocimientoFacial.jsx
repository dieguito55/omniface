import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    if (!cams.length) {
      loadCameras(false);
    }
  }, []);

  const loadCameras = (force = false) => {
    api
      .get(`/recon/camaras?force=${force}`)
      .then((r) => {
        setCams(r.data.camaras);
        localStorage.setItem("cachedCameras", JSON.stringify(r.data.camaras));
      })
      .catch(() => setCams([]));
  };

  const reloadModel = () => {
    const token = localStorage.getItem("access_token")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      console.error("Token no encontrado");
      return;
    }
    api
      .get(`/recon/reload_model?token=${token}`)
      .then((r) => console.log(r.data.mensaje))
      .catch((e) => console.error("Error recargando modelo:", e));
  };

  const reloadCameras = () => {
    localStorage.removeItem("cachedCameras");
    loadCameras(true);
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
      <div className="relative w-full aspect-[16/9] rounded-lg bg-black shadow-md overflow-hidden">
        {/* Camera Selector */}
        <div className="absolute right-2 top-2 z-10">
          <select
            value={camSelections[i]}
            onChange={(e) => handleCamSelect(i, e.target.value)}
            className="rounded-md border-gray-300 bg-white px-2 py-1 text-gray-700 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            disabled={data.connected}
          >
            {cams.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Rotation Buttons for small cameras */}
        {numCamaras === 3 && i === 1 && (
          <button
            onClick={rotateCCW}
            className="absolute left-[-20px] top-1/2 z-20 -translate-y-1/2 bg-white/80 text-blue-600 p-2 rounded-full shadow-md hover:bg-white hover:scale-110 transition-all duration-300"
            title="Girar antihorario"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 scale-x-[-1]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
        {numCamaras === 3 && i === 2 && (
          <button
            onClick={rotateCW}
            className="absolute left-[-20px] top-1/2 z-20 -translate-y-1/2 bg-white/80 text-blue-600 p-2 rounded-full shadow-md hover:bg-white hover:scale-110 transition-all duration-300"
            title="Girar horario"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
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
      <div className="grid gap-2 grid-cols-1 place-items-center w-full">
        {renderCamera(0)}
      </div>
    );
  } else if (numCamaras === 2) {
    cameraLayout = (
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 w-full">
        {renderCamera(0)}
        {renderCamera(1)}
      </div>
    );
  } else if (numCamaras === 3) {
    cameraLayout = (
      <div className="grid gap-2 grid-cols-1 md:grid-cols-[2fr_1fr] md:grid-rows-2 w-full md:[&>:first-child]:row-span-2">
        {renderCamera(0)}
        {renderCamera(1)}
        {renderCamera(2)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
      {/* Control Panel */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700">Cámaras:</label>
          <select
            value={numCamaras}
            onChange={(e) => setNumCamaras(parseInt(e.target.value))}
            className="rounded-md border-gray-300 bg-white px-2 py-1 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="font-medium text-gray-700">Modo:</label>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            className="rounded-md border-gray-300 bg-white px-2 py-1 text-gray-700 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="asistencia">Asistencia</option>
            <option value="normal">Normal</option>
            <option value="salida">Salida</option>
          </select>
        </div>
        <button
          onClick={reloadModel}
          className="rounded-md bg-blue-600 px-4 py-1 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Recargar Modelo
        </button>
        <button
          onClick={reloadCameras}
          className="rounded-md bg-green-600 px-4 py-1 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Recargar Cámaras
        </button>
      </div>

      {/* Camera Layout */}
      {cameraLayout}

      {/* Mode-Specific Panels */}
      {modo === "asistencia" && (
        <div className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm w-full">
          <AsistenciasHoy />
        </div>
      )}
      {modo === "salida" && (
        <div className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm w-full">
          <SalidasHoy />
        </div>
      )}
    </div>
  );
}