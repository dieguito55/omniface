import { FaBars, FaHome, FaBell, FaCog, FaSignOutAlt } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import api from "../api/api";

export default function Topbar({ titulo, toggleSidebar, cerrarSesion }) {
  const [usuario, setUsuario] = useState({ nombre: "...", imagen: "default.png" });
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

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

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          <FaHome className="text-yellow-300" />
          <span className="text-white">Inicio</span>
          <span className="text-yellow-300"> &gt; </span>
          <span className="text-yellow-200">{titulo}</span>
        </span>
      </div>

      {/* Sección derecha */}
      <div className="flex items-center gap-6 relative">
        {/* Icono de notificaciones */}
        <div className="relative cursor-pointer" title="Notificaciones">
          <FaBell className="text-2xl hover:text-yellow-300 transition-colors" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        </div>

        {/* Imagen de usuario */}
        <div className="relative">
          <img
            src={`/avatars/${usuario.imagen}`}
            alt="Perfil"
            className="w-11 h-11 rounded-full border-2 border-yellow-400 shadow-md cursor-pointer object-cover hover:scale-105 transition-transform"
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
