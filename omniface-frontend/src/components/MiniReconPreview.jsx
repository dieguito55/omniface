import { useEffect, useRef } from "react";
import { useGlobalRecon } from "../context/GlobalReconContext";
import { useRecon } from "../context/ReconContext";

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
      className="fixed bottom-4 right-4 z-40 shadow-xl resize rounded-lg border-2 border-blue-400/50 overflow-auto bg-white/10 backdrop-blur-sm"
      style={{ width: 520, height: 340 }}
    >
      {/* Select para elegir cámara */}
      <div className="absolute top-2 right-2 z-50">
        <select
          value={activePreviewCam}
          onChange={(e) => setActivePreviewCam(parseInt(e.target.value))}
          className="px-2 py-1 border rounded bg-white text-sm"
        >
          {[...Array(numCamaras)].map((_, i) => (
            <option key={i} value={i}>Cámara {i + 1} (ID: {camSelections[i]})</option>
          ))}
        </select>
      </div>
      <canvas ref={cvsRef} className="w-full h-full pointer-events-none" />
    </div>
  );
}