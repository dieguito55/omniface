import { useEffect, useRef } from "react";
import { useRecon } from "../context/ReconContext";

export default function MiniReconPreview({ visible }) {
  const { data } = useRecon();
  const cvsRef   = useRef(null);

  /* pinta miniatura */
  useEffect(() => {
    if (!visible || !data.lastFrame) return;
    const img = new Image();
    img.src = `data:image/jpeg;base64,${data.lastFrame}`;
    img.onload = () => {
      const cvs = cvsRef.current;
      if (!cvs) return;
      const size = 320;
      cvs.width  = size;
      cvs.height = (img.height / img.width) * size;
      cvs.getContext("2d", { alpha:false })
         .drawImage(img,0,0,cvs.width,cvs.height);
    };
  }, [data.lastFrame, visible]);

  if (!visible || !data.connected) return null;

  return (
  <div
    className="fixed bottom-4 right-4 z-40 shadow-xl resize rounded-lg border-2 border-blue-400/50 overflow-auto bg-white/10 backdrop-blur-sm"
    style={{ width: 520, height: 340 }}  // tamaño inicial
  >
    <canvas
      ref={cvsRef}
      className="w-full h-full pointer-events-none"
    />
  </div>
);
}
