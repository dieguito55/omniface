import { createContext, useContext, useState, useEffect } from "react";

const GlobalReconContext = createContext(null);

export function GlobalReconProvider({ children }) {
  const [numCamaras, setNumCamaras] = useState(() => localStorage.getItem("numCamaras") || 1);
  const [modo, setModo] = useState(() => localStorage.getItem("modo") || "normal");
  const [camSelections, setCamSelections] = useState(() => JSON.parse(localStorage.getItem("camSelections")) || [0, 0, 0]);
  const [activePreviewCam, setActivePreviewCam] = useState(0);  // Cámara para mini-preview

  useEffect(() => {
    localStorage.setItem("numCamaras", numCamaras);
    localStorage.setItem("modo", modo);
    localStorage.setItem("camSelections", JSON.stringify(camSelections));
  }, [numCamaras, modo, camSelections]);

  return (
    <GlobalReconContext.Provider value={{
      numCamaras, setNumCamaras,
      modo, setModo,
      camSelections, setCamSelections,
      activePreviewCam, setActivePreviewCam
    }}>
      {children}
    </GlobalReconContext.Provider>
  );
}

export function useGlobalRecon() {
  return useContext(GlobalReconContext);
}