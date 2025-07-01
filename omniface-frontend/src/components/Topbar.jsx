// omniface-frontend/src/components/Topbar.jsx
import { FaBars, FaHome, FaBell, FaCog, FaSignOutAlt } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import api from "../api/api";

export default function Topbar({ titulo, toggleSidebar, cerrarSesion, cambiarVista }) {
  const [usuario, setUsuario] = useState({ nombre: "...", imagen: "default.png" });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState(0);
  const menuRef = useRef(null);
const [menuNotiAbierto, setMenuNotiAbierto] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
  const obtenerNotificaciones = async () => {
    try {
      const res = await api.get("/personas/notificaciones");
      setNotificaciones(res.data.pendientes || 0);
    } catch (err) {
      console.warn("⚠️ Error al obtener notificaciones:", err);
    }
  };

  // Llamado inicial
  obtenerNotificaciones();

  // Actualizar cada 15 segundos
  const intervalo = setInterval(obtenerNotificaciones, 3000);

  // Limpiar intervalo al desmontar
  return () => clearInterval(intervalo);
}, []);


  return (
    <header className="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-[#1C2540] via-[#2D3C74] to-[#402D53] text-white shadow-md rounded-tr-3xl relative z-20">
      {/* Sección izquierda */}
      <div className="flex items-center gap-4">
        <FaBars
          className="text-3xl cursor-pointer hover:scale-105 transition-transform"
          onClick={toggleSidebar}
          title="Menú"
        />
        <span className="text-2xl font-semibold tracking-wide flex items-center gap-2">
          <FaHome className="text-blue-300" />
          <span className="text-white">Inicio</span>
          <span className="text-blue-300"> &gt; </span>
          <span className="text-blue-200">{titulo}</span>
        </span>
      </div>

      {/* Sección derecha */}
      <div className="flex items-center gap-6 relative">
       {/* Icono de notificaciones con menú desplegable */}
<div className="relative" ref={menuRef}>
  <div
    className="relative cursor-pointer"
    title="Notificaciones"
    onClick={() => setMenuNotiAbierto(prev => !prev)}
  >
    <FaBell className="text-2xl hover:text-blue-300 transition-colors" />
    {notificaciones > 0 && (
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
        {notificaciones}
      </span>
    )}
  </div>

  {/* Menú desplegable de notificaciones */}
  {menuNotiAbierto && (
    <div className="absolute right-0 mt-2 w-80 bg-white text-black rounded-lg shadow-xl z-50 animate-fade-in max-h-[300px] overflow-y-auto">
      <div className="px-4 py-3 border-b bg-[#2D3C74] text-white font-semibold">
        Notificaciones
      </div>
      {notificaciones > 0 ? (
        <div className="px-4 py-2 text-sm">
          <p className="mb-2">⚠️ Hay <strong>{notificaciones}</strong> persona(s) sin mejora de imagen para el modelo.</p>
          <button
            onClick={() => cambiarVista("GestionPersonas")}
            className="text-blue-600 hover:underline text-sm"
          >
            Ir a gestionar
          </button>
        </div>
      ) : (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          No hay notificaciones pendientes.
        </div>
      )}
    </div>
  )}
</div>


        {/* Imagen de usuario */}
        <div className="relative">
          <img
            src={`/avatars/${usuario.imagen}`}
            alt="Perfil"
            className="w-11 h-11 rounded-full border-2 border-blue-400 shadow-md cursor-pointer object-cover hover:scale-105 transition-transform"
            onClick={() => setMenuAbierto(!menuAbierto)}
          />

          {/* Menú desplegable */}
          {menuAbierto && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-44 bg-white text-black rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in"
            >
              <div className="px-4 py-2 text-sm font-medium bg-[#2D3C74] text-white">
                {usuario.nombre}
              </div>
              <button
                onClick={() => alert("Ir a configuración")}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
              >
                <FaCog className="text-gray-600" />
                Configuración
              </button>
              <button
                onClick={cerrarSesion}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
              >
                <FaSignOutAlt />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
