import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { useRecon } from "../context/ReconContext";
import api from "../api/api";
import "chart.js/auto";
import {
  FaPlay, FaPause, FaStop, FaVideo
} from "react-icons/fa";

export default function ReconocimientoFacial() {
  const { data, connect, pause, resume, stop } = useRecon();
  const canvasRef  = useRef(null);
  const [cams, setCams] = useState([]);
  const [camSel, setCamSel] = useState(
    Number(localStorage.getItem("omniface_cam") ?? 0)
  );

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
      cvs.width  = img.width;
      cvs.height = img.height;
      ctx.drawImage(img,0,0,cvs.width,cvs.height);
    };
  }, [data.lastFrame]);

  const handleStart = () => connect(camSel);
  const handlePauseResume = () => data.paused ? resume() : pause();

  return (
    <div className="space-y-6">
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
      <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
        <canvas ref={canvasRef} />
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
