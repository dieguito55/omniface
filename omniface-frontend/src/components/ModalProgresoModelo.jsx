// omniface-frontend/src/components/ModalProgresoModelo.jsx
import { useEffect, useState, useRef } from "react";
import { FaCheckCircle, FaSpinner, FaTimes, FaRobot, FaUserAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function ModalProgresoModelo({
  personas,
  estimado,
  backendListo,
  onAnimEnd,
  onClose,
}) {
  const [indice, setIndice] = useState(0);
  const [progresoGlobal, setProgreso] = useState(0);
  const [etapaActual, setEtapaActual] = useState("preparando");
  const [landmarks, setLandmarks] = useState([]);
  const tiempoInicio = useRef(Date.now());
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  // Etapas de procesamiento con duraciones relativas
  const etapas = [
    { nombre: "carga", duracion: 0.2, icon: "📷", color: "text-blue-400" },
    { nombre: "validacion", duracion: 0.3, icon: "🔍", color: "text-yellow-400" },
    { nombre: "deteccion", duracion: 0.4, icon: "👁️", color: "text-purple-400" },
    { nombre: "landmarks", duracion: 1.0, icon: "📍", color: "text-green-400" },
    { nombre: "embedding", duracion: 1.5, icon: "🧬", color: "text-indigo-400" },
    { nombre: "guardado", duracion: 0.6, icon: "💾", color: "text-teal-400" }
  ];

  // Generar landmarks aleatorios realistas (68 puntos como en los modelos reales)
  const generarLandmarks = () => {
    const puntos = [];
    // Contorno del rostro (17 puntos)
    for (let i = 0; i < 17; i++) {
      puntos.push({
        x: 0.5 + Math.cos((i / 16) * Math.PI * 2) * 0.4 * (0.9 + Math.random() * 0.1),
        y: 0.5 + Math.sin((i / 16) * Math.PI * 2) * 0.5 * (0.9 + Math.random() * 0.1)
      });
    }
    // Ojos, nariz, boca (51 puntos restantes)
    for (let i = 0; i < 51; i++) {
      puntos.push({
        x: 0.5 + (Math.random() - 0.5) * 0.3,
        y: 0.5 + (Math.random() - 0.5) * 0.2
      });
    }
    return puntos;
  };

 // Reemplaza el useEffect de animación con este código:
useEffect(() => {
  if (personas.length === 0) return;

  let etapaIndex = 0;
  let cancelado = false;
  const personaDuration = (estimado * 1000) / personas.length;
  const etapaDuration = personaDuration / etapas.reduce((sum, e) => sum + e.duracion, 0);

  const nextEtapa = () => {
    if (cancelado || indice >= personas.length) return;

    if (etapaIndex < etapas.length) {
      const etapa = etapas[etapaIndex];
      setEtapaActual(etapa.nombre);
      
      if (etapa.nombre === "landmarks") {
        setLandmarks(generarLandmarks());
      }

      setTimeout(() => {
        if (!cancelado) {
          etapaIndex++;
          nextEtapa();
        }
      }, etapa.duracion * etapaDuration);
    } else {
      // Solo avanzar si no hemos llegado al final
      if (indice < personas.length - 1) {
        setIndice(i => i + 1);
        setProgreso(Math.round(((indice + 1) / personas.length) * 100));
        setEtapaActual("preparando");
        etapaIndex = 0;
        nextEtapa();
      } else {
        // Última persona completada
        setProgreso(100);
        onAnimEnd();
      }
    }
  };

  nextEtapa();

  return () => {
    cancelado = true;
  };
}, [indice, personas.length]); // Añadimos personas.length a las dependencias// eslint-disable-line

  // Temporizador real
  useEffect(() => {
    const timer = setInterval(() => {
      setTiempoTranscurrido(Math.floor((Date.now() - tiempoInicio.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const personaActual = personas[indice] || {};
  const tiempoRestante = Math.max(0, estimado - tiempoTranscurrido);

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 w-full max-w-2xl rounded-xl p-6 border border-gray-700 shadow-2xl text-white relative overflow-hidden"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <FaRobot className="text-2xl text-blue-400" />
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Procesamiento Facial
            </h3>
          </div>
          <p
            className="text-gray-400 hover:text-white transition-colors"
          >
            NO RECARGUES NI CIERRES LA PAGINA
          </p>
        </div>

        {/* Contenido principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna izquierda - Visualización */}
          <div className="md:col-span-2">
            <div className="relative w-full aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              {personaActual.imagen_url ? (
                <>
                  <img
                    src={`http://192.168.100.42:8000${personaActual.imagen_url}`}
                    alt={personaActual.nombre}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay de detección */}
                  <AnimatePresence>
                    {etapaActual === "deteccion" && (
                      <motion.div
                        className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Landmarks */}
                  {landmarks.length > 0 && (
                    <div className="absolute inset-0">
                      {landmarks.map((point, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-yellow-400 rounded-full -ml-1 -mt-1 shadow-lg"
                          style={{
                            left: `${point.x * 100}%`,
                            top: `${point.y * 100}%`
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.005 }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Embedding visualization */}
                  {etapaActual === "embedding" && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="relative w-64 h-64">
                        {/* Representación visual del embedding */}
                        {Array.from({ length: 512 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"
                            style={{
                              left: `${50 + Math.cos(i / 20) * 40}%`,
                              top: `${50 + Math.sin(i / 20) * 40}%`,
                              opacity: 0.7
                            }}
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 0.9, 0.3]
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 2,
                              delay: i * 0.002
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <FaUserAlt className="text-4xl" />
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha - Información */}
          <div className="space-y-6">
            {/* Información de la persona */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-lg mb-2 truncate">
                {personaActual.nombre || "Esperando..."}
              </h4>
              <div className="text-sm text-gray-400">
                {personaActual.departamento || "—"}
              </div>
            </div>

            {/* Etapa actual */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-sm mb-3 text-gray-400">
                ETAPA ACTUAL
              </h4>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {etapas.find(e => e.nombre === etapaActual)?.icon || "⚙️"}
                </span>
                <div>
                  <div className="font-medium capitalize">
                    {etapaActual.replace("_", " ") || "Preparando"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {getEtapaDescription(etapaActual)}
                  </div>
                </div>
              </div>
            </div>

            {/* Progreso */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progreso individual</span>
                <span>
                  {Math.min(indice + 1, personas.length)}/{personas.length}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-2 bg-gradient-to-r from-blue-400 to-purple-400"
                  animate={{ width: `${((indice + 1) / personas.length) * 100}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span>Tiempo transcurrido</span>
                <span>
                  {Math.floor(tiempoTranscurrido / 60)}m {tiempoTranscurrido % 60}s
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tiempo estimado restante</span>
                <span>
                  {Math.floor(tiempoRestante / 60)}m {tiempoRestante % 60}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estado final */}
        <AnimatePresence>
          {backendListo && (
            <motion.div
              className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="bg-green-500/20 rounded-full p-6 mb-4 border border-green-400/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <FaCheckCircle className="text-4xl text-green-400" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">Modelo generado</h3>
              <p className="text-gray-300 text-center mb-6">
                Se procesaron {personas.length} rostros correctamente
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Descripciones para cada etapa
function getEtapaDescription(etapa) {
  switch (etapa) {
    case "carga":
      return "Cargando imagen y verificando formato";
    case "validacion":
      return "Validando resolución, enfoque e iluminación";
    case "deteccion":
      return "Detectando rostros en la imagen";
    case "landmarks":
      return "Identificando puntos faciales clave";
    case "embedding":
      return "Generando vector de características único";
    case "guardado":
      return "Almacenando en la base de datos";
    default:
      return "Preparando para el procesamiento";
  }
}