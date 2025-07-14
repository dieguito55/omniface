import {
  createContext, useContext, useRef,
  useState, useEffect, useCallback
} from "react";

/* --- host backend --- */
const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_WS ??
  `${window.location.hostname}:8000`;
/* -------------------- */

/* 1 Context por cámara → se almacena en este mapa */
const CtxMap = {};
function getCtx(id) {
  return (CtxMap[id] ??= createContext(null));
}

/* ────────────────────────────── */
export function ReconProvider({ camId = 0, modo = "normal", children }) {
  const ReconCtx = getCtx(camId);
  const ws = useRef(null);

  /* estado base */
  const blank = () => ({
    connected   : false,
    paused      : false,
    fps         : 0,
    faces       : [],
    latency     : 0,
    lastFrame   : null,
    fpsHist     : [],
    latencyHist : [],
    error       : null
  });
  const [data, setData] = useState(blank);

  /* abrir WS */
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const raw   = localStorage.getItem("access_token") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "");
    if (!token) {
      setData(d => ({ ...d, error:"Token no encontrado" }));
      return;
    }

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url   = `${proto}://${BACKEND_HOST}/recon/ws?cam_id=${camId}&token=${token}&modo=${modo}`;
    ws.current  = new WebSocket(url);

    ws.current.onopen  = () => setData(d=>({...d,connected:true,paused:false,error:null}));
    ws.current.onclose = (event) => {
  console.log(`[WS] Cerrado: code=${event.code}, reason=${event.reason}`);
  setData(d => ({ ...d, connected: false }));
};
   ws.current.onerror = (event) => {
  console.error("[WS] Error:", event);
  setData(d => ({ ...d, error: "No se pudo conectar. Revisa consola del servidor." }));
};

    /* throttle 60 ms ≈ 16 fps */
    let lastEmit = 0;
    ws.current.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "error") {
        setData(d => ({ ...d, error: msg.detail }));
        return;
      }
      if (msg.type !== "frame") return;

      const now     = performance.now();
      if (now - lastEmit < 60) return;
      lastEmit = now;

      const latency = Date.now() - msg.timestamp*1000;

      setData(d => ({
        ...d,
        lastFrame   : d.paused ? d.lastFrame : msg.frame,
        faces       : msg.faces,
        fps         : msg.fps,
        latency,
        fpsHist     : [...d.fpsHist.slice(-59), msg.fps],
        latencyHist : [...d.latencyHist.slice(-59), latency]
      }));
    };
  }, [camId, modo]);

  /* controles */
  const pause  = () => setData(d => ({ ...d, paused:true  }));
  const resume = () => setData(d => ({ ...d, paused:false }));
  const stop = useCallback(() => {
  if (ws.current) {
    ws.current.close(1000, "Stopped by user");  // Cierra con código normal
    ws.current = null;
  }
  setData(blank());  // Resetea estado inmediatamente
}, []);

  /* cerrar al salir */
  useEffect(()=> () => ws.current?.close(), []);

  return (
    <ReconCtx.Provider value={{ data, connect, pause, resume, stop }}>
      {children}
    </ReconCtx.Provider>
  );
}

/* hook de consumo */
export function useRecon(camId = 0) {
  const ctx = useContext( getCtx(camId) );
  if (!ctx) throw new Error("useRecon debe usarse dentro de ReconProvider");
  return ctx;
}