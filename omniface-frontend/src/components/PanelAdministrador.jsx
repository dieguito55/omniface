import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// Vistas
import Inicio from "../pages/Inicio";
import GestionPersonas from "../pages/GestionPersonas";
import GenerarModelo from "../pages/GenerarModelo";
import ReconocimientoFacial from "../pages/ReconocimientoFacial";
import HistorialAsistencia from "../pages/HistorialAsistencia";
import Configuracion from "../pages/Configuracion";
import Notificacion from "../pages/Notificacion";

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
    // Si es móvil, oculta el sidebar tras clic
    if (esMovil) setSidebarColapsado(true);
  };

  const renderContenido = () => {
    switch (vistaActual) {
      case "Inicio": return <Inicio />;
      case "GestionPersonas": return <GestionPersonas />;
      case "GenerarModelo": return <GenerarModelo />;
      case "ReconocimientoFacial": return <ReconocimientoFacial />;
      case "HistorialAsistencia": return <HistorialAsistencia />;
      case "Configuracion": return <Configuracion />;
      case "Notificacion": return <Notificacion />;
      default: return <Inicio />;
    }
  };

  return (
    <div className="min-h-screen bg-[#605970] flex items-center justify-center">
      <div className="relative w-full h-[100vh] bg-white rounded-[5rem] shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar
          vistaActual={vistaActual}
          cambiarVista={cambiarVista}
          cerrarSesion={cerrarSesion}
          colapsado={sidebarColapsado}
        />

        {/* Contenido principal */}
        <div className={`flex-1 flex flex-col transition-all duration-300
          ${!sidebarColapsado && esMovil ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
          <Topbar
  titulo={vistaActual}
  toggleSidebar={() => setSidebarColapsado(prev => !prev)}
  cerrarSesion={cerrarSesion}
/>
          <div className="p-6 flex-1 overflow-y-auto">
            {renderContenido()}
          </div>
        </div>
      </div>
    </div>
  );
}
