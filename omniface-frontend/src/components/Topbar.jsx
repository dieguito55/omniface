// omniface-frontend/src/components/Topbar.jsx
import { FaBars, FaBell, FaCog, FaSignOutAlt, FaChevronRight,FaHome, FaUserFriends, FaClock, FaCamera, FaHistory } from "react-icons/fa";
import { HiOutlineUserCircle, HiOutlineSparkles } from "react-icons/hi";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import api from "../api/api";

export default function Topbar({ titulo, toggleSidebar, cerrarSesion, cambiarVista }) {
  const [usuario, setUsuario] = useState({ nombre: "...", imagen: "default.png" });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState(0);
  const [menuNotiAbierto, setMenuNotiAbierto] = useState(false);
  const menuRef = useRef(null);
  const notiRef = useRef(null);

  // Obtener perfil del usuario
  useEffect(() => {
    const obtenerPerfil = async () => {
      try {
        const res = await api.get("/usuarios/perfil");
        setUsuario({
          nombre: res.data.nombre,
          imagen: res.data.imagen || "default.png"
        });
      } catch (err) {
        console.warn("❌ Error al cargar perfil:", err);
      }
    };
    obtenerPerfil();
  }, []);

  // Manejar clic fuera del menú
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setMenuNotiAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Obtener notificaciones
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
const iconosPorVista = {
  Inicio: <FaHome className="text-[#7fb3ff]" />,
  GestionPersonas: <FaUserFriends className="text-[#7fb3ff]" />,
  GenerarModelo: <FaClock className="text-[#7fb3ff]" />,
  ReconocimientoFacial: <FaCamera className="text-[#7fb3ff]" />,
  HistorialAsistencia: <FaHistory className="text-[#7fb3ff]" />,
  Configuracion: <FaCog className="text-[#7fb3ff]" />,
  Notificacion: <FaBell className="text-[#7fb3ff]" />
};


const iconoActual = iconosPorVista[titulo] || null;

  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex justify-between items-center px-8 py-5 bg-gradient-to-r from-[#0f172a] to-[#1e2c4a] text-white shadow-lg border-b border-white/10 relative z-30"
    >
      {/* Sección izquierda */}
      <div className="flex items-center gap-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="text-2xl text-[#a0c4ff] hover:text-white transition-colors"
          title="Menú"
        >
          <FaBars />
        </motion.button>

        <div className="flex items-center gap-3">
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className="flex items-center gap-2 text-lg font-medium"
  >
    <span className="text-[#7fb3ff] flex items-center gap-2">
      <FaHome /> Inicio
    </span>
    <FaChevronRight className="text-xs text-white/50" />
    <span className="text-white/90 flex items-center gap-2">
      {iconoActual}
      {titulo}
    </span>
  </motion.div>
</div>

      </div>

      {/* Sección derecha */}
      <div className="flex items-center gap-6">
        {/* Notificaciones */}
        <div className="relative" ref={notiRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuNotiAbierto(!menuNotiAbierto)}
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Notificaciones"
          >
            <FaBell className="text-xl text-[#a0c4ff]" />
            {notificaciones > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg"
              >
                {notificaciones}
              </motion.span>
            )}
          </motion.button>

          {/* Menú de notificaciones */}
          <AnimatePresence>
            {menuNotiAbierto && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute right-0 mt-3 w-80 bg-[#1e2c4a] rounded-xl shadow-2xl border border-white/10 backdrop-blur-lg z-50 overflow-hidden"
              >
                <div className="px-5 py-4 bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <FaBell className="text-[#7fb3ff]" />
                      Notificaciones
                    </h3>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                      {notificaciones} nuevas
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  {notificaciones > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-500/20 rounded-full">
                          <HiOutlineSparkles className="text-red-400 text-lg" />
                        </div>
                        <div>
                          <h4 className="font-medium">Imágenes pendientes</h4>
                          <p className="text-sm text-white/80 mt-1">
                            Hay {notificaciones} persona(s) que necesitan mejora de imagen para el modelo.
                          </p>
                          <motion.button
                            whileHover={{ x: 5 }}
                            onClick={() => {
                              cambiarVista("GestionPersonas");
                              setMenuNotiAbierto(false);
                            }}
                            className="mt-2 text-sm text-[#7fb3ff] hover:text-[#a0c4ff] flex items-center gap-1"
                          >
                            Gestionar ahora <FaChevronRight className="text-xs" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-white/60">
                      <p>No hay notificaciones pendientes</p>
                      <p className="text-xs mt-1">Todo está al día</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Perfil del usuario */}
        <div className="relative" ref={menuRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <img
                src={`/avatars/${usuario.imagen}`}
                alt="Perfil"
                className="w-10 h-10 rounded-full border-2 border-[#7fb3ff]/50 object-cover shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
            </div>
            {!menuAbierto && (
              <span className="hidden md:inline-block text-sm font-medium max-w-[120px] truncate">
                {usuario.nombre}
              </span>
            )}
          </motion.button>

          {/* Menú desplegable */}
          <AnimatePresence>
            {menuAbierto && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute right-0 mt-3 w-56 bg-[#1e2c4a] rounded-xl shadow-2xl border border-white/10 backdrop-blur-lg z-50 overflow-hidden"
              >
                <div className="px-5 py-4 bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] border-b border-white/10">
                  <h3 className="font-semibold truncate">Hola, {usuario.nombre}</h3>
                  <p className="text-xs text-white/60 mt-1">Administrador</p>
                </div>
                
                <div className="p-2">
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => {
                      alert("Ir a configuración");
                      setMenuAbierto(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <FaCog className="text-[#7fb3ff]" />
                    Configuración
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => {
                      cerrarSesion();
                      setMenuAbierto(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                  >
                    <FaSignOutAlt />
                    Cerrar sesión
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}