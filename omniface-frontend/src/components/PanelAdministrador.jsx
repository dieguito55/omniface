// src/components/PanelAdministrador.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

export default function PanelAdministrador() {
  const navigate = useNavigate();

  useEffect(() => {
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
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-green-300 to-green-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center">
        <h1 className="text-4xl font-bold text-green-800 mb-2">
          Bienvenido al Panel de Administrador 👑
        </h1>
        <p className="text-gray-600 mb-6">Has ingresado correctamente</p>
        <button
          onClick={cerrarSesion}
          className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
