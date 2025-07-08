import {
  createContext, useContext, useRef,
  useState, useEffect, useCallback
} from "react";

/* ---------- host backend WS ---------- */
const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_WS ??
  `${window.location.hostname}:8000`;
/* ------------------------------------- */

const ReconCtx = createContext(null);

/* ───────────────────────────────────── */
export function ReconProvider({ children }) {
  const ws = useRef(null);

  /* estado base */
  const nuevoEstado = () => ({
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
  const [data, setData] = useState(nuevoEstado);

  /* ----------------------------------- */
  /* abrir conexión                      */
  /* ----------------------------------- */
  const connect = useCallback((camId = 0) => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const raw = localStorage.getItem("access_token") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "");
    if (!token) {
      setData(d => ({ ...d, error: "Token no encontrado" }));
      return;
    }

    localStorage.setItem("omniface_cam", camId);

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url   = `${proto}://${BACKEND_HOST}/recon/ws` +
                  `?cam_id=${camId}&token=${token}`;

    ws.current = new WebSocket(url);

    ws.current.onopen = () =>
      setData(d => ({ ...d, connected:true, paused:false, error:null }));

    ws.current.onclose = () =>
      setData(d => ({ ...d, connected:false }));

    ws.current.onerror = () =>
      setData(d => ({ ...d, error:"No se pudo conectar al servidor" }));

    /* throttle para no forzar re-renders constantes
       solo actualizamos React cada 60 ms aprox (≈16 fps) */
    let ultimoEmit = 0;

    ws.current.onmessage = ev => {
      const msg = JSON.parse(ev.data);

      if (msg.type === "error") {
        setData(d => ({ ...d, error:msg.detail }));
        return;
      }
      if (msg.type !== "frame") return;

      const ahora = performance.now();
      if (ahora - ultimoEmit < 60) return;   // throttle
      ultimoEmit = ahora;

      const latency = Date.now() - msg.timestamp * 1000;

      setData(d => {
        const lastFrame = d.paused ? d.lastFrame : msg.frame;
        return {
          ...d,
          lastFrame,
          faces       : msg.faces,
          fps         : msg.fps,
          latency,
          fpsHist     : [...d.fpsHist.slice(-59), msg.fps],
          latencyHist : [...d.latencyHist.slice(-59), latency]
        };
      });
    };
  }, []);

  /* ----------------------------------- */
  /* pausar / reanudar / detener         */
  /* ----------------------------------- */
  const pause  = () => setData(d => ({ ...d, paused:true  }));
  const resume = () => setData(d => ({ ...d, paused:false }));
  const stop   = useCallback(() => {
    localStorage.removeItem("omniface_cam");
    ws.current?.close();
    ws.current = null;
    setData(nuevoEstado());
  }, []);

  /* cerrar al descargar la pestaña */
  useEffect(() => () => ws.current?.close(), []);

  /* autoreconectar tras refresh */
  useEffect(() => {
    const cam = localStorage.getItem("omniface_cam");
    if (cam) connect(Number(cam));
  }, [connect]);

  return (
    <ReconCtx.Provider
      value={{ data, connect, pause, resume, stop }}
    >
      {children}
    </ReconCtx.Provider>
  );
}

export function useRecon() {
  const ctx = useContext(ReconCtx);
  if (!ctx) throw new Error("useRecon debe usarse dentro de ReconProvider");
  return ctx;
}
