import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { GlobalReconProvider, useGlobalRecon } from "../context/GlobalReconContext";  // Import correcto
import ReconCamInner from "./ReconCamInner";  // Importa ReconCamInner
import { ReconProvider } from "../context/ReconContext";  // Importa para MultiProvider

// Vistas
import Inicio from "../pages/Inicio";
import GestionPersonas from "../pages/GestionPersonas";
import GenerarModelo from "../pages/GenerarModelo";
import ReconocimientoFacial from "../pages/ReconocimientoFacial";
import HistorialAsistencia from "../pages/HistorialAsistencia";
import Configuracion from "../pages/Configuracion";
import Notificacion from "../pages/Notificacion";
import MiniReconPreview from "../components/MiniReconPreview";
import EmocionesVivo from "../pages/EmocionesVivo";
import LocationVivo from "../pages/LocationVivo";


export default function PanelAdministrador() {
  const navigate = useNavigate();
  const [vistaActual, setVistaActual] = useState("Inicio");
  const [sidebarColapsado, setSidebarColapsado] = useState(false);
  const [esMovil, setEsMovil] = useState(false);

  useEffect(() => {
    const manejarRedimension = () => {
      const movil = window.innerWidth <= 768;
      setEsMovil(movil);
      setSidebarColapsado(movil);
    };

    manejarRedimension();
    window.addEventListener("resize", manejarRedimension);

    const verificarSesion = async () => {
      try {
        const res = await api.get("/usuarios/perfil");
        console.log("✅ Usuario verificado:", res.data);
      } catch (error) {
        console.warn("⛔ Token inválido o expirado:", error);
        const nuevo_token = localStorage.getItem("access_token");
        if (!nuevo_token) {
          navigate("/?expirado=true");
        }
      }
    };
    verificarSesion();

    return () => {
      window.removeEventListener("resize", manejarRedimension);
    };
  }, [navigate]);

  const cerrarSesion = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  const cambiarVista = (nuevaVista) => {
    setVistaActual(nuevaVista);
    if (esMovil) setSidebarColapsado(true);
  };

  const renderContenido = () => {
    switch (vistaActual) {
      case "Inicio": return <Inicio />;
      case "GestionPersonas": return <GestionPersonas />;
      case "GenerarModelo": return <GenerarModelo />;
      case "ReconocimientoFacial": return <ReconocimientoFacial />;
      case "HistorialAsistencia": return <HistorialAsistencia />;
      case "DashboardEstadistico": return null;  // Nada, solo expand sidebar
      case "EmocionesVivo": return <EmocionesVivo />;
      case "LocationVivo": return <LocationVivo />;
      case "CombinedGeneral": return <CombinedGeneral />;
      case "Configuracion": return <Configuracion />;
      case "Notificacion": return <Notificacion />;
      default: return <Inicio />;
    }
  };

  return (
    <GlobalReconProvider>
      <div className="min-h-screen bg-[#605970] flex items-center justify-center">
        <div className="relative w-full h-[100vh] bg-white shadow-2xl flex overflow-hidden">
          
          {/* Sidebar */}
          <Sidebar
            vistaActual={vistaActual}
            cambiarVista={cambiarVista}
            cerrarSesion={cerrarSesion}
            colapsado={sidebarColapsado}
          />

          {/* Contenido principal envuelto en MultiProvider */}
          <MultiProvider>
            <div className={`flex-1 flex flex-col transition-all duration-300
              ${!sidebarColapsado && esMovil ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
              <Topbar
                titulo={vistaActual}
                toggleSidebar={() => setSidebarColapsado(prev => !prev)}
                cerrarSesion={cerrarSesion}
                cambiarVista={cambiarVista}
              />
              <div className="p-6 flex-1 overflow-y-auto">
                {renderContenido()}
              </div>
              <MiniReconPreview visible={vistaActual !== "ReconocimientoFacial"} />
            </div>
          </MultiProvider>
        </div>
      </div>
    </GlobalReconProvider>
  );
}

function MultiProvider({ children }) {
  const { numCamaras, modo, camSelections } = useGlobalRecon();

  let node = children;
  for (let i = numCamaras - 1; i >= 0; i--) {
    const cam = camSelections[i];
    node = (
      <ReconProvider key={`${cam}-${modo}`} camId={cam} modo={modo}>
        {node}
      </ReconProvider>
    );
  }
  return node;
}