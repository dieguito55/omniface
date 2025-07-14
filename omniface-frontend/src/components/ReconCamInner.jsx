import { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause, FaStop } from "react-icons/fa";
import { useRecon } from "../context/ReconContext";

export default function ReconCamInner({ camId, modo }) {
  const { data, connect, pause, resume, stop } = useRecon(camId, modo);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState({x:1, y:1});

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", {alpha: false});
    if (!data.lastFrame) {
      ctx.fillStyle = "black"; ctx.fillRect(0, 0, cvs.width, cvs.height);
      return;
    }
    const img = new Image();
    img.src = `data:image/jpeg;base64,${data.lastFrame}`;
    img.onload = () => {
      const {clientWidth: w, clientHeight: h} = cvs;
      cvs.width = w; cvs.height = h;
      setScale({x: w / img.naturalWidth, y: h / img.naturalHeight});
      ctx.drawImage(img, 0, 0, w, h);
    };
  }, [data.lastFrame]);

  return (
    <div className="relative h-full">
      {/* Botones izquierda */}
      <div className="absolute top-2 left-2 flex gap-2 z-10">
        <button className="bg-green-600 text-white p-2 rounded disabled:bg-gray-400"
          onClick={connect} disabled={data.connected}><FaPlay/></button>
        <button className={`${data.paused ? "bg-blue-600" : "bg-yellow-500"} text-white p-2 rounded`}
          onClick={() => data.paused ? resume() : pause()} disabled={!data.connected}>
          {data.paused ? <FaPlay/> : <FaPause/>}
        </button>
        <button className="bg-red-600 text-white p-2 rounded disabled:bg-gray-400"
          onClick={stop} disabled={!data.connected}><FaStop/></button>
      </div>

      {/* Badge Rostros arriba-derecha */}
      <div className="absolute top-2 right-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
        Rostros: {data.faces.length}
      </div>

                  {/* Canvas */}
      <div className="w-full h-full max-h-full aspect-[16/9] bg-black rounded-lg relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        {data.faces.map((f, i) => {
  const [x1, y1, x2, y2] = f.bbox;
  const sx = scale.x, sy = scale.y;
  return (
    <div key={i}
      className={`absolute text-xs p-1 rounded shadow
        ${f.nombre === "Desconocido" ? "bg-red-100 text-red-700" : "bg-white"}
        ${f.registrado ? "animate-bounce" : ""}`}
      style={{left: x2 * sx, top: y1 * sy - 60, width: 100}}>
      {f.foto_path &&
        <img className="w-full h-12 object-cover rounded"
          src={`http://localhost:8000/imagenes_originales/${f.foto_path}`}
          alt={f.nombre}/>}
      <p className="font-bold truncate">{f.nombre}</p>
      <p>Emoción: {f.emocion}</p> 
      {f.registrado && <p className="text-green-600">✔</p>}
    </div>
  );
})}
      </div>

      {data.error && <p className="text-red-600 mt-2">{data.error}</p>}
    </div>
  );
}