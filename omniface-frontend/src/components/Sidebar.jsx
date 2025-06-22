// src/components/Sidebar.jsx
import {
  FaHome, FaUserFriends, FaClock, FaCamera,
  FaHistory, FaCog, FaBell
} from "react-icons/fa";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/api";
import { Tooltip } from "react-tooltip";

const opciones = [
  { label: "INICIO", icon: <FaHome />, key: "Inicio" },
  { label: "GESTIÓN DE PERSONAS", icon: <FaUserFriends />, key: "GestionPersonas" },
  { label: "GENERAR MODELO", icon: <FaClock />, key: "GenerarModelo" },
  { label: "RECONOCIMIENTO FACIAL", icon: <FaCamera />, key: "ReconocimientoFacial" },
  { label: "HISTORIAL DE ASISTENCIA", icon: <FaHistory />, key: "HistorialAsistencia" },
  { label: "CONFIGURACIÓN", icon: <FaCog />, key: "Configuracion" },
  { label: "NOTIFICACIÓN", icon: <FaBell />, key: "Notificacion" },
];

export default function Sidebar({ vistaActual, cambiarVista, colapsado }) {
  const [usuario, setUsuario] = useState({ nombre: "...", imagen: "default.png" });
  const [estadoServidor, setEstadoServidor] = useState("online");
  const [textoAnimado, setTextoAnimado] = useState("");

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
    const texto = `Mr. ${usuario.nombre}`;
    const intervalo = setInterval(() => {
      setTextoAnimado(prev => {
        const siguiente = texto.slice(0, i + 1);
        i++;
        if (i === texto.length) clearInterval(intervalo);
        return siguiente;
      });
    }, 60);
    return () => clearInterval(intervalo);
  }, [usuario.nombre]);

  return (
    <motion.aside
  initial={{ x: -300, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  transition={{ duration: 0.7 }}
  className={`transition-all duration-300 ease-in-out
    ${
      colapsado
        ? "w-[80px] md:relative" // 🔒 Modo colapsado (en PC se queda fijo a la izquierda)
        : "w-72 md:relative absolute top-0 left-0 z-50" // 🟢 Modo expandido
    }
    h-full bg-gradient-to-b from-[#402D53] via-[#2D3C74] to-[#1C2540] text-white
    backdrop-blur-lg border-r-4 border-[#2C2F4A] flex flex-col justify-between py-4 shadow-2xl`}
>
      <div>
        {/* LOGO */}
        <div className={`flex items-center ${colapsado ? "justify-center" : "justify-center"} py-2 border-b border-[#2C2F4A] px-4`}>
          <img src="/logo.png" alt="Logo" className={`${colapsado ? "h-10" : "h-14"} transition-all`} />
          {!colapsado && (
            <h1 className="ml-2 text-3xl font-extrabold font-irish text-white">
              Omni<span className="text-yellow-400">face</span>
            </h1>
          )}
        </div>

        {/* PERFIL */}
        <div className={`flex items-center gap-3 mt-6 mb-4 px-4 relative ${colapsado ? "flex-col" : ""}`}>
          <img
            src={`/avatars/${usuario.imagen}`}
            alt="Usuario"
            className="w-14 h-14 rounded-full border-[2.5px] border-yellow-300 shadow-md object-cover"
          />
          {!colapsado && (
            <div>
              <p className="font-bold text-[16px] font-Poppins">Hola 👋</p>
              <p className="text-[14px] text-yellow-200 font-Poppins">{textoAnimado}</p>
            </div>
          )}
          {/* Estado servidor */}
          <div className={`absolute ${colapsado ? "bottom-[-6px] left-[50%] -translate-x-1/2" : "bottom-[-6px] left-[6rem]"} flex items-center gap-1`}>
            <div className={`w-3 h-3 rounded-full ${estadoServidor === "online" ? "bg-green-400" : "bg-red-500"} animate-pulse`} />
            {!colapsado && (
              <span className="text-[10px] text-gray-200 font-light">
                {estadoServidor === "online" ? "Servidor en línea" : "Sin conexión"}
              </span>
            )}
          </div>
        </div>

        {/* NAV */}
        <nav className="space-y-3 mt-4 px-2">
          {opciones.map(({ label, icon, key }) => (
            <div
              key={key}
              className={`relative group flex items-center ${colapsado ? "justify-center" : "justify-start"} gap-4 
                px-6 py-4 text-[16px] font-Poppins cursor-pointer transition-all duration-300 ease-in-out
                ${vistaActual === key
                  ? "bg-yellow-400 text-black rounded-l-none rounded-r-full shadow-xl scale-105"
                  : "hover:bg-yellow-200 hover:text-black hover:scale-[1.02] rounded-full text-white"
                }`}
              onClick={() => cambiarVista(key)}
              data-tooltip-id="sidebar-tooltip"
              data-tooltip-content={label}
            >
              <span className="text-[30px] p-2 rounded-full bg-white/20 group-hover:bg-white/30">
                {icon}
              </span>
              {!colapsado && <span>{label}</span>}
            </div>
          ))}
        </nav>

        {/* TOOLTIP GENERAL */}
        <Tooltip id="sidebar-tooltip" place="right" />
      </div>
    </motion.aside>
  );
}
