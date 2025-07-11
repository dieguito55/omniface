import { useEffect, useRef, useState } from "react"; 
import { Line } from "react-chartjs-2";
import { useRecon } from "../context/ReconContext";
import api from "../api/api";
import "chart.js/auto";
import {
  FaPlay, FaPause, FaStop, FaVideo
} from "react-icons/fa";
import AsistenciasHoy from "../pages/AsistenciasHoy";  // 🆕 importamos componente

export default function ReconocimientoFacial() {
  const { data, connect, pause, resume, stop } = useRecon();
  const canvasRef  = useRef(null);
  const [cams, setCams] = useState([]);
  const [camSel, setCamSel] = useState(
    Number(localStorage.getItem("omniface_cam") ?? 0)
  );
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);

  /* cargar cámaras */
  useEffect(() => {
    const cached = sessionStorage.getItem("omniface_cams");
    if (cached) {
      setCams(JSON.parse(cached));
    } else {
      api.get("/recon/camaras")
        .then(r => {
          setCams(r.data.camaras);
          sessionStorage.setItem("omniface_cams",
            JSON.stringify(r.data.camaras));
        })
        .catch(() => setCams([]));
    }
  }, []);

  /* pintar frame */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const ctx = cvs.getContext("2d", { alpha:false });
    if (!data.lastFrame) {
      ctx.fillStyle = "black";
      ctx.fillRect(0,0,cvs.width,cvs.height);
      return;
    }

    const img = new Image();
    img.src = `data:image/jpeg;base64,${data.lastFrame}`;
    img.onload = () => {
      const width  = cvs.clientWidth;
      const height = cvs.clientHeight;
      cvs.width = width;
      cvs.height = height;
      setScaleX(width / img.naturalWidth);
      setScaleY(height / img.naturalHeight);
      ctx.drawImage(img, 0, 0, width, height);
    };
  }, [data.lastFrame]);

  const handleStart = () => connect(camSel);
  const handlePauseResume = () => data.paused ? resume() : pause();

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Panel izquierdo: Reconocimiento en vivo */}
      <div className="lg:w-2/3 space-y-6">
        <h2 className="text-2xl font-bold text-[#2C2F4A] flex items-center gap-2">
          <FaVideo /> Reconocimiento Facial en Vivo
        </h2>

        {/* controles */}
        <div className="flex gap-3 flex-wrap items-center">
          <select
            className="border p-2 rounded"
            value={camSel}
            onChange={e => setCamSel(Number(e.target.value))}
            disabled={data.connected}
          >
            {cams.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleStart}
            disabled={data.connected}
            className="bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FaPlay /> Iniciar
          </button>

          <button
            onClick={handlePauseResume}
            disabled={!data.connected}
            className={`px-4 py-2 rounded flex items-center gap-2
              ${data.paused ? "bg-blue-600" : "bg-yellow-500"} text-white`}
          >
            {data.paused ? <FaPlay /> : <FaPause />}
            {data.paused ? "Reanudar" : "Pausar"}
          </button>

          <button
            onClick={stop}
            disabled={!data.connected}
            className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <FaStop /> Detener
          </button>

          <span
            className={`px-3 py-1 rounded-full text-sm
              ${data.connected ? (data.paused ? "bg-blue-400" : "bg-green-500") : "bg-gray-400"}`}
          >
            {data.connected
              ? data.paused ? "Pausado" : "Conectado"
              : "Desconectado"}
          </span>
        </div>

        {/* canvas vídeo */}
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
          {data.faces.map((face, i) => {
            const scaledX1 = face.bbox[0] * scaleX;
            const scaledY1 = face.bbox[1] * scaleY;
            const scaledX2 = face.bbox[2] * scaleX;
            return (
              <div
                key={i}
                className={`absolute p-2 rounded shadow-lg text-xs w-24 ${
                  face.nombre === "Desconocido" ? "bg-red-100 text-red-700" : "bg-white"
                } ${face.registrado ? "animate-bounce" : ""}`}
                style={{
                  top: `${scaledY1 - 80}px`,  // Arriba del rostro (ajusta 80 por altura del card)
                  left: `${scaledX2}px`       // A la derecha del bounding box
                }}
              >
                {face.foto_path && (
                  <img
                    src={`http://localhost:8000/imagenes_originales/${face.foto_path}`}
                    alt={face.nombre}
                    className="w-10 h-10 object-cover rounded mb-1"
                  />
                )}
                <p className="font-bold">{face.nombre}</p>
                <p>Sim: {face.similitud.toFixed(2)}</p>
                {face.registrado && <p className="text-green-500">Registrado</p>}
              </div>
            );
          })}
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="FPS"      value={data.fps.toFixed(1)} />
          <Stat label="Rostros"  value={data.faces.length} />
          <Stat label="Latencia" value={`${data.latency.toFixed(0)} ms`} />
        </div>

        {/* gráfico FPS */}
        <Line
          height={180}
          data={{
            labels: Array(data.fpsHist.length).fill(""),
            datasets: [{
              label           : "FPS",
              data            : data.fpsHist,
              borderColor     : "#4CAF50",
              backgroundColor : "rgba(76,175,80,.1)",
              tension         : .25,
              fill            : true
            }]
          }}
          options={{
            animation : false,
            plugins   : { legend: { display:false } },
            scales    : { y: { min:0, max:60 } }
          }}
        />

        {data.error && (
          <p className="text-red-600 font-medium">{data.error}</p>
        )}
      </div>

      {/* Panel derecho: Asistencias del día */}
      <div className="lg:w-1/3">
        <AsistenciasHoy />
      </div>
    </div>
  );
}

/* mini-stat */
function Stat({ label, value }) {
  return (
    <div className="p-4 bg-gray-100 rounded text-center">
      <h4 className="text-xs text-gray-500">{label}</h4>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}