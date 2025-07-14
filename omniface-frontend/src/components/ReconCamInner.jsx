import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaStop, FaUser, FaRegClock, FaRegSmile } from "react-icons/fa";
import { useRecon } from "../context/ReconContext";

export default function ReconCamInner({ camId, modo }) {
  const { data, connect, pause, resume, stop } = useRecon(camId, modo);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState({x: 1, y: 1});
  const [isHoveringControls, setIsHoveringControls] = useState(false);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    
    const ctx = cvs.getContext("2d", { alpha: false });
    if (!data.lastFrame) {
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      return;
    }
    
    const img = new Image();
    img.src = `data:image/jpeg;base64,${data.lastFrame}`;
    img.onload = () => {
      const { clientWidth: w, clientHeight: h } = cvs;
      cvs.width = w; 
      cvs.height = h;
      setScale({x: w / img.naturalWidth, y: h / img.naturalHeight});
      
      ctx.drawImage(img, 0, 0, w, h);
      
      const gradient = ctx.createRadialGradient(
        w/2, h/2, h*0.4,
        w/2, h/2, h*0.8
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    };
  }, [data.lastFrame]);

  return (
    <div className="relative h-full group">
      {/* Botones de control con efecto hover */}
      <div 
        className={`absolute top-3 left-3 flex gap-2 z-10 transition-all duration-300 ${isHoveringControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
        <button 
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${data.connected ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
          onClick={connect} 
          disabled={data.connected}
        >
          <FaPlay className="text-xs" />
          <span>Iniciar</span>
        </button>
        
        <button 
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!data.connected ? 'bg-gray-400 cursor-not-allowed' : data.paused ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'} text-white shadow-md`}
          onClick={() => data.paused ? resume() : pause()} 
          disabled={!data.connected}
        >
          {data.paused ? (
            <>
              <FaPlay className="text-xs" />
              <span>Reanudar</span>
            </>
          ) : (
            <>
              <FaPause className="text-xs" />
              <span>Pausar</span>
            </>
          )}
        </button>
        
        <button 
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!data.connected ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white shadow-md`}
          onClick={stop} 
          disabled={!data.connected}
        >
          <FaStop className="text-xs" />
          <span>Detener</span>
        </button>
      </div>

      {/* Canvas con borde sutil */}
      <div className="w-full h-full max-h-full aspect-[16/9] bg-gray-900 rounded-xl relative overflow-hidden border border-gray-700/50">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        
        {/* Overlay de rostros detectados */}
        {data.faces.map((f, i) => {
  const [x1, y1, x2, y2] = f.bbox;
  const sx = scale.x, sy = scale.y;
  const isUnknown = f.nombre === "Desconocido";
  
  // Depuración temporal: quítalo después de probar
  console.log(`[DEBUG] Foto para ${f.nombre}: ${f.foto_path}`);  // Ver si llega el path
  
  return (
    <div 
      key={i}
      className={`absolute text-xs p-1.5 rounded-lg shadow-lg transition-all duration-200
        ${isUnknown ? "bg-red-900/90 text-red-100 border border-red-700" : "bg-gray-900/90 text-white border border-gray-600"}
        ${f.registrado ? "animate-pulse border-2 border-emerald-400" : ""}`}
      style={{
        left: `${x2 * sx}px`,
        top: `${Math.max(0, y1 * sy - 70)}px`,  // Ajuste para no salirse arriba
        width: "110px",
        backdropFilter: "blur(4px)"
      }}
    >
      {f.foto_path && (
  <img 
    className="w-full h-14 object-cover rounded-md mb-1 border border-gray-600"
    src={`http://localhost:8000/imagenes_originales/${f.foto_path}`}
    alt={f.nombre}
  />
)}
      
      <p className="font-semibold truncate text-sm flex items-center gap-1">
        {f.registrado && (
          <span className="text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        {f.nombre}
      </p>
      
      <div className="flex items-center gap-1 text-xs mt-0.5">
        <FaRegSmile className="text-amber-400" />
        <span className="truncate">{f.emocion || 'No detectada'}</span>
      </div>
      
      {f.confidence && (
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
          <div 
            className={`h-1.5 rounded-full ${f.confidence > 0.7 ? 'bg-emerald-400' : f.confidence > 0.4 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${f.confidence * 100}%` }}
          ></div>
        </div>
      )}
    </div>
  );
})}
      </div>

      {/* Badge de métricas movido a la parte inferior */}
      <div className="absolute bottom-3 left-3 flex gap-2 z-10">
        <div className="flex items-center gap-1 bg-gray-900/80 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-gray-700">
          <FaUser className="text-emerald-400" />
          <span>Rostros: {data.faces.length}</span>
        </div>
        
        {data.fps && (
          <div className="flex items-center gap-1 bg-gray-900/80 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm border border-gray-700">
            <FaRegClock className="text-blue-400" />
            <span>{data.fps} FPS</span>
          </div>
        )}
      </div>

      {/* Mensaje de error mejorado */}
      {data.error && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-md text-sm font-medium backdrop-blur-sm shadow-lg z-10">
          {data.error}
        </div>
      )}
    </div>
  );
}