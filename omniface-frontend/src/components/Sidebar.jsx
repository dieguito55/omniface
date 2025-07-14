// omniface-frontend/src/components/Sidebar.jsx
import {
  FaHome, FaUserFriends, FaClock, FaCamera,
  FaHistory, FaCog, FaBell, FaServer, FaChevronRight,
  FaChartBar,  // Nuevo para dashboard
  FaChevronDown  // Nuevo para expand
} from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import { HiOutlineChip } from "react-icons/hi";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/api";
import { Tooltip } from "react-tooltip";

const opciones = [
  { label: "Inicio", icon: <FaHome />, key: "Inicio" },
  { label: "Gestión de Personas", icon: <FaUserFriends />, key: "GestionPersonas" },
  { label: "Generar Modelo", icon: <FaClock />, key: "GenerarModelo" },
  { label: "Reconocimiento Facial", icon: <FaCamera />, key: "ReconocimientoFacial" },
  { label: "Historial", icon: <FaHistory />, key: "HistorialAsistencia" },
  { 
    label: "Dashboard Estadístico", 
    icon: <FaChartBar />, 
    key: "DashboardEstadistico",
    subOpciones: [  // Sub-menú
      { label: "Emociones en Vivo", key: "EmocionesVivo" },
      { label: "Localización en Vivo", key: "LocationVivo" },
    ]
  },
  { label: "Configuración", icon: <FaCog />, key: "Configuracion" },
  { label: "Notificaciones", icon: <FaBell />, key: "Notificacion", notifica: true },
];

const ServerStatusIndicator = ({ status, colapsado }) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className={`flex items-center ${colapsado ? "justify-center" : "justify-between"} p-2 rounded-lg bg-gradient-to-r ${status === "online" ? "from-green-900/30 to-green-800/20" : "from-red-900/30 to-red-800/20"} backdrop-blur-sm`}
  >
    <div className="flex items-center">
      <div className={`p-1 rounded-full ${status === "online" ? "bg-green-400/90" : "bg-red-400/90"} shadow-lg`}>
        <HiOutlineChip className={`${status === "online" ? "text-green-100" : "text-red-100"} text-sm`} />
      </div>
      {!colapsado && (
        <div className="ml-3">
          <p className="text-xs font-medium text-white/80">Servidor</p>
          <p className={`text-xs font-bold ${status === "online" ? "text-green-400" : "text-red-400"}`}>
            {status === "online" ? "OPERATIVO" : "INACTIVO"}
          </p>
        </div>
      )}
    </div>
    {!colapsado && (
      <div className={`text-xs px-2 py-1 rounded-full ${status === "online" ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
        {status === "online" ? "LIVE" : "OFF"}
      </div>
    )}
  </motion.div>
);

const NavItem = ({ item, isActive, colapsado, notificaciones, onClick, hoveredItem, setHoveredItem, isSub = false }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onHoverStart={() => setHoveredItem(item.key)}
    onHoverEnd={() => setHoveredItem(null)}
    className={`relative flex items-center ${colapsado ? "justify-center" : "justify-start"} 
      ${isActive ? "bg-white/10" : "hover:bg-white/5"} 
      rounded-xl mx-1 p-3 cursor-pointer transition-all duration-200
      ${isSub ? "pl-6 text-sm" : ""}  // Indent para sub
      ${isActive ? "border-l-4 border-[#7fb3ff]" : ""}`}
    onClick={onClick}
    data-tooltip-id="sidebar-tooltip"
    data-tooltip-content={item.label}
  >
    <div className="relative">
      <motion.span
        animate={{
          color: isActive ? "#7fb3ff" : "#a0c4ff",
          scale: isActive ? 1.1 : 1
        }}
        className="text-lg"
      >
        {item.icon}
      </motion.span>
      {item.notifica && notificaciones > 0 && (
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg"
        >
          {notificaciones}
        </motion.span>
      )}
    </div>
    
    {!colapsado && (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="ml-3 overflow-hidden"
      >
        <p className="text-sm font-medium text-white/90">{item.label}</p>
        {isActive && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-xs text-[#7fb3ff]"
          >
            Activo
          </motion.p>
        )}
      </motion.div>
    )}

    {!colapsado && isActive && (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="ml-auto"
      >
        <FaChevronRight className="text-[#7fb3ff] text-xs" />
      </motion.div>
    )}

    <AnimatePresence>
      {hoveredItem === item.key && colapsado && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute left-full ml-3 px-3 py-2 bg-[#1e2c4a] text-white text-sm rounded-lg shadow-xl whitespace-nowrap z-50 border border-white/10"
        >
          {item.label}
          {item.notifica && notificaciones > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded-full text-xs">
              {notificaciones}
            </span>
          )}
          <div className="absolute top-1/2 -left-1.5 w-3 h-3 bg-[#1e2c4a] transform -translate-y-1/2 rotate-45 border-l border-t border-white/10" />
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

export default function Sidebar({ vistaActual, cambiarVista, cerrarSesion, colapsado }) {
  const [usuario, setUsuario] = useState({ nombre: "...", imagen: "default.png" });
  const [estadoServidor, setEstadoServidor] = useState("online");
  const [textoAnimado, setTextoAnimado] = useState("");
  const [notificaciones, setNotificaciones] = useState(0);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);  // Para toggle sub-menús

  useEffect(() => {
    const obtenerNotificaciones = async () => {
      try {
        const res = await api.get("/personas/notificaciones");
        setNotificaciones(res.data.pendientes || 0);
      } catch (err) {
        console.warn("⚠️ Error al obtener notificaciones:", err);
      }
    };

    obtenerNotificaciones();
    const intervalo = setInterval(obtenerNotificaciones, 3000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const obtenerPerfil = async () => {
      try {
        const res = await api.get("/usuarios/perfil");
        setUsuario({
          nombre: res.data.nombre,
          imagen: res.data.imagen || "default.png"
        });
      } catch (err) {
        setEstadoServidor("offline");
      }
    };
    obtenerPerfil();
  }, []);

  useEffect(() => {
    let i = 0;
    let mostrando = true;
    const texto = usuario.nombre;
    
    const intervalo = setInterval(() => {
      setTextoAnimado(prev => {
        if (mostrando) {
          const siguiente = texto.slice(0, i + 1);
          i++;
          if (i > texto.length) {
            mostrando = false;
            i = texto.length - 1;
          }
          return siguiente;
        } else {
          const siguiente = texto.slice(0, i);
          i--;
          if (i < 0) {
            mostrando = true;
            i = 0;
          }
          return siguiente;
        }
      });
    }, 340);

    return () => clearInterval(intervalo);
  }, [usuario.nombre]);

  const toggleExpand = (key) => {
    setExpandedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`h-full bg-gradient-to-b from-[#0f172a] to-[#0a1120] text-white
        border-r border-white/10 flex flex-col justify-between
        ${colapsado ? "w-20" : "w-64"} transition-all duration-300 ease-in-out shadow-2xl relative z-50`}
    >
      {/* Efecto de borde luminoso */}
      <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-[#7fb3ff] to-[#a0c4ff] rounded-r-full" />

      <div className="p-2">
        {/* LOGO */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className={`flex items-center ${colapsado ? "justify-center py-4" : "justify-start px-3 py-4"} mb-2`}
        >
          <motion.div
            animate={{
              rotate: isHovered ? 360 : 0,
              scale: isHovered ? 1.1 : 1
            }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src="/logo.png" 
              alt="Logo" 
              className={`${colapsado ? "h-8" : "h-9 mr-2"} transition-all drop-shadow-lg`} 
            />
          </motion.div>
          {!colapsado && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold bg-gradient-to-r from-[#7fb3ff] to-[#a0c4ff] bg-clip-text text-transparent"
            >
              Omniface
            </motion.h1>
          )}
        </motion.div>

        {/* PERFIL */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className={`flex items-center ${colapsado ? "justify-center py-3" : "justify-start px-3 py-3"} mb-4 rounded-xl bg-white/5 backdrop-blur-sm`}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="relative"
          >
            <img
              src={`/avatars/${usuario.imagen}`}
              alt="Usuario"
              className={`${colapsado ? "w-10 h-10" : "w-12 h-12"} rounded-full border-2 border-[#7fb3ff]/50 shadow-lg object-cover`}
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                boxShadow: estadoServidor === "online" 
                  ? "0 0 0 2px rgba(74, 222, 128, 0.8)" 
                  : "0 0 0 2px rgba(248, 113, 113, 0.8)"
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`absolute ${colapsado ? "-bottom-1 -right-1" : "bottom-0 right-0"} w-3 h-3 rounded-full ${estadoServidor === "online" ? "bg-green-400" : "bg-red-500"} border border-white`}
            />
          </motion.div>
          
          {!colapsado && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-3 overflow-hidden"
            >
              <p className="text-xs font-medium text-white/60">Bienvenido</p>
              <p className="text-[#a0c4ff] font-semibold text-sm truncate max-w-[160px]">
                {textoAnimado || ""}
              <span className="animate-pulse">|</span>

              </p>
            </motion.div>
          )}
        </motion.div>

        {/* NAV con sub-menú */}
        <nav className="space-y-1 mt-2">
          {opciones.map((item) => (
            <div key={item.key}>
              <NavItem
                item={item}
                isActive={vistaActual === item.key}
                colapsado={colapsado}
                notificaciones={notificaciones}
                onClick={() => {
                  if (item.subOpciones) {
                    toggleExpand(item.key);  // Toggle expand
                  } else {
                    cambiarVista(item.key);
                  }
                }}
                hoveredItem={hoveredItem}
                setHoveredItem={setHoveredItem}
              />
              <AnimatePresence>
                {expandedKeys.includes(item.key) && item.subOpciones && !colapsado && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-4 space-y-1"
                  >
                    {item.subOpciones.map(sub => (
                      <NavItem
                        key={sub.key}
                        item={sub}
                        isActive={vistaActual === sub.key}
                        colapsado={colapsado}
                        onClick={() => cambiarVista(sub.key)}
                        hoveredItem={hoveredItem}
                        setHoveredItem={setHoveredItem}
                        isSub={true}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
      </div>

      {/* FOOTER */}
      <div className="p-2 space-y-2">
        <ServerStatusIndicator status={estadoServidor} colapsado={colapsado} />
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center ${colapsado ? "justify-center" : "justify-start px-3"} py-3 rounded-xl hover:bg-white/5 cursor-pointer`}
          onClick={cerrarSesion}
        >
          <FiLogOut className="text-lg text-red-300/80" />
          {!colapsado && (
            <span className="ml-3 text-sm font-medium text-white/80">Cerrar sesión</span>
          )}
        </motion.div>
      </div>

      {/* TOOLTIP PARA MODO COLAPSADO */}
      <Tooltip 
        id="sidebar-tooltip" 
        place="right" 
        effect="solid"
        className="z-50 !bg-[#1e2c4a] !text-white !opacity-100 !rounded-lg !px-3 !py-2 !border !border-white/10"
        offset={{ right: 15 }}
      />
    </motion.aside>
  );
}