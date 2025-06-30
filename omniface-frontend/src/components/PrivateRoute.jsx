// omniface-frontend/src/components/PrivateRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import api from "../api/api";

export default function PrivateRoute() {
  const [estado, setEstado] = useState("verificando"); // 'verificando', 'autorizado', 'no-autorizado'

  useEffect(() => {
    const verificar = async () => {
      try {
        const res = await api.get("/usuarios/perfil");
        console.log("✅ Sesión válida o token refrescado", res.data);
        setEstado("autorizado");
      } catch (error) {
        console.warn("❌ Token inválido incluso tras refresh");
        setEstado("no-autorizado");
      }
    };

    verificar();
  }, []);

  if (estado === "verificando") {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-600">
        Verificando sesión...
      </div>
    );
  }

  if (estado === "autorizado") return <Outlet />;

  return <Navigate to="/?expirado=true" replace />;
}
