import { useEffect, useRef } from "react";
import { useGlobalRecon } from "../context/GlobalReconContext";
import { useRecon } from "../context/ReconContext";
import { FaVideo, FaTimes, FaChevronDown } from "react-icons/fa";

export default function MiniReconPreview({ visible }) {
  const { numCamaras, camSelections, activePreviewCam, setActivePreviewCam } = useGlobalRecon();
  const { data } = useRecon(camSelections[activePreviewCam]);
  const cvsRef = useRef(null);

  useEffect(() => {
    if (!visible || !data.lastFrame) return;
    const img = new Image();
    img.src = `data:image/jpeg;base64,${data.lastFrame}`;
    img.onload = () => {
      const cvs = cvsRef.current;
      if (!cvs) return;
      const size = 320;
      cvs.width = size;
      cvs.height = (img.height / img.width) * size;
      cvs.getContext("2d", { alpha: false }).drawImage(img, 0, 0, cvs.width, cvs.height);
    };
  }, [data.lastFrame, visible]);

  if (!visible || !data.connected) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 shadow-2xl rounded-xl border border-[#91baff]/50 overflow-hidden bg-gradient-to-br from-[#1e2c4a]/90 to-[#3b2f5e]/90 backdrop-blur-md transition-all duration-300 hover:shadow-3xl"
      style={{ width: 520, height: 340 }}
    >
      {/* Cabecera con título y controles */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] p-2 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <FaVideo className="text-[#a0c4ff]" />
          <span className="text-white font-medium text-sm">Vista Previa en Vivo</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de cámara mejorado */}
          <div className="relative">
            <select
              value={activePreviewCam}
              onChange={(e) => setActivePreviewCam(parseInt(e.target.value))}
              className="appearance-none pl-3 pr-8 py-1 border border-[#91baff]/30 rounded-lg bg-[#1e2c4a]/70 text-white text-sm focus:border-[#a0c4ff] focus:ring-1 focus:ring-[#a0c4ff]/30 cursor-pointer"
            >
              {[...Array(numCamaras)].map((_, i) => (
                <option key={i} value={i} className="bg-[#1e2c4a]">
                  Cámara {i + 1} (ID: {camSelections[i]})
                </option>
              ))}
            </select>
            <FaChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#a0c4ff] text-xs pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Canvas con borde sutil */}
      <div className="absolute inset-0 m-2 mt-12 rounded-lg overflow-hidden border border-[#91baff]/20 bg-[#1e2c4a]">
        <canvas 
          ref={cvsRef} 
          className="w-full h-full object-contain pointer-events-none" 
        />
      </div>

      {/* Indicador de estado */}
      <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-50">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>Transmitiendo</span>
      </div>

      {/* Efecto de esquina superior izquierda */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#a0c4ff] rounded-tl-xl pointer-events-none"></div>
    </div>
  );
}