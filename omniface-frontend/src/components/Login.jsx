// omniface-frontend/src/components/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { FaLinkedin, FaFacebookF, FaGoogle } from "react-icons/fa";

export default function Login() {
  const [modoLogin, setModoLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [error, setError] = useState("");
const [esDesktop, setEsDesktop] = useState(window.innerWidth >= 1024);
  const [confirmar, setConfirmar] = useState("");
const [verPassword, setVerPassword] = useState(false);
const [verConfirmacion, setVerConfirmacion] = useState(false);

const [correoValidoMsg, setCorreoValidoMsg] = useState("");
const [passValidoMsg, setPassValidoMsg] = useState("");
const [confirmarMsg, setConfirmarMsg] = useState("");
  const navigate = useNavigate();

  // Detectar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setEsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const res = await api.get("/usuarios/perfil");
        if (res.status === 200) {
          navigate("/paneladministrador");
        }
      } catch (err) {
        // Token inválido, continuar
      }
    };
    verificarSesion();

  }, []);
  useEffect(() => {
  if (correo.length > 0) {
    setCorreoValidoMsg(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
        ? ""
        : "❌ El correo no es válido"
    );
  } else {
    setCorreoValidoMsg("");
  }
}, [correo]);

useEffect(() => {
  if (contraseña.length > 0) {
    setPassValidoMsg(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(contraseña)
        ? ""
        : "❌ Al menos 8 caracteres, una mayúscula, una minúscula y un número"
    );
  } else {
    setPassValidoMsg("");
  }
}, [contraseña]);

useEffect(() => {
  if (!modoLogin && confirmar.length > 0) {
    setConfirmarMsg(
      confirmar === contraseña
        ? ""
        : "❌ Las contraseñas no coinciden"
    );
  } else {
    setConfirmarMsg("");
  }
}, [confirmar, contraseña, modoLogin]);


  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (modoLogin) {
      try {
        const res = await api.post("/auth/login", { correo, contraseña });
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
        navigate("/paneladministrador");
      } catch (err) {
        setError("❌ Credenciales incorrectas");
      }
    } else {
      try {
        const res = await api.post("/auth/registrar", {
          nombre,
          correo,
          contraseña,
        });
        console.log("✅ Registro exitoso:", res.data);
        setModoLogin(true);
        setNombre("");
        setCorreo("");
        setContraseña("");
        setError("✅ Registro exitoso. Ahora inicia sesión.");
      } catch (err) {
        if (err.response?.status === 409) {
          setCorreoValidoMsg("❌ El correo ya está registrado");
        } else {
          setError("❌ Error al registrar");
        }
      }
    }
  };
  function TextoAnimado({ texto }) {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    const delay = borrando ? 20 : 50; // velocidad de borrado/escritura
    const timeout = setTimeout(() => {
      if (!borrando) {
        // Escribiendo
        setDisplayedText(texto.slice(0, index + 1));
        setIndex(index + 1);
        if (index + 1 === texto.length) {
          setTimeout(() => setBorrando(true), 1500); // espera antes de borrar
        }
      } else {
        // Borrando
        setDisplayedText(texto.slice(0, index - 1));
        setIndex(index - 1);
        if (index - 1 === 0) {
          setBorrando(false);
        }
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [index, borrando, texto]);

  return (
    <p className="text-center text-lg md:text-xl font-medium leading-7 px-6 py-3 rounded-md mb-4 text-white font-quicksand whitespace-pre-wrap">
      {displayedText}
      <span className="animate-pulse">|</span>
    </p>
  );
}

  return (
  <div
  className="min-h-screen bg-cover bg-center relative flex items-center justify-center p-4 font-poppins"
  style={{ backgroundImage: "url('/fondo-login.jpg')" }} // Usa tu imagen
>
  {/* Capa desenfocada encima */}
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>

  {/* Contenido encima del fondo desenfocado */}
  <div className="relative z-10 w-full flex justify-center items-center">
     {esDesktop ? (
    <div className="relative w-full max-w-5xl h-[560px] bg-white shadow-2xl rounded-xl overflow-hidden">
      {/* Panel deslizante */}
      <div
  className={`absolute top-0 h-full w-1/2 bg-[url('/fondo.jpg')] bg-cover bg-center text-white transition-all duration-700 ease-in-out z-20 overflow-hidden ${
  modoLogin ? "left-1/2" : "left-0"
}`}
>
  {/* Imagen de fondo */}
  {modoLogin ? (
    <div className="h-1/2 w-full">
      <img
        src="/probar.gif"
        alt="Fondo"
  className="absolute inset-0 w-full h-full object-cover object-center z-0"
      />
    </div>
  ) : (
    <img
  src="/cara.png"
  alt="Fondo"
  className="absolute inset-0 w-full h-full object-cover object-center z-0"
/>
  )}

  {/* Contenido encima del fondo */}
 <div
  className={`${
    modoLogin ? "h-1/2" : "absolute bottom-0 w-full"
  } z-10 flex flex-col justify-center items-center p-6 bg-opacity-80 ${
    modoLogin ? "" : "bg-[#]/70"
  } transform -translate-y-2`} // ⬅️ sube 1rem aprox
>

    <TextoAnimado
  texto={
    modoLogin
      ? "Regístrate en el sistema, presiona este botón y crea tu cuenta."
      : "Inicia sesión con tus credenciales y continúa gestionando tu sistema de reconocimiento facial."
  }
/>
   <button
  onClick={() => {
    setModoLogin(!modoLogin);
    setError("");
  }}
  className="bg-[#343B57] text-white px-12 py-4 text-xl rounded-2xl shadow-md hover:bg-white hover:text-black font-semibold transition-all duration-300"
>
  {modoLogin ? "Registrarse" : "Inicio de sesión"}
</button>

  </div>
</div>


      {/* Formulario */}
      <div
  className={`absolute top-0 w-1/2 h-full bg-white p-10 transition-all duration-700 ease-in-out z-10 ${
    modoLogin ? "left-0" : "left-1/2"
  } flex flex-col justify-between`}
>
        {/* Logo */}
        <div className="flex items-center mb-4">
          <img src="/logo.png" alt="Omniface Logo" className="h-12 mr-1" />
          <span className="text-3xl font-bold text-[#2C2F4A]">
            Omni<span className="text-blue-500">face</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-black mb-6 text-center">
          {modoLogin ? "Inicio de sesión" : "Registrarse"}
        </h1>

<form className="flex-grow space-y-2 flex flex-col justify-between" onSubmit={manejarSubmit}>
          {!modoLogin && (
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border border-gray-300"
              required
            />
          )}
          <div className="relative">
  <input
    type="email"
    placeholder="Correo Electrónico"
    value={correo}
    onChange={(e) => setCorreo(e.target.value)}
    className={`w-full px-4 py-3 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border pr-12 ${
      correoValidoMsg ? "border-red-500" : "border-gray-300"
    }`}
    required
  />
  {correoValidoMsg && (
    <div className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
      {correoValidoMsg}
    </div>
  )}
</div>

          
<div className="relative">
  <input
    type={verPassword ? "text" : "password"}
    placeholder="Contraseña"
    value={contraseña}
    onChange={(e) => setContraseña(e.target.value)}
    className={`w-full px-4 py-3 pr-12 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border ${
      !modoLogin && passValidoMsg ? "border-red-500" : "border-gray-300"
    }`}
    required
  />
  <button
    type="button"
    onClick={() => setVerPassword(!verPassword)}
    className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600"
  >
    {verPassword ? "🙈" : "👁️"}
  </button>
  {!modoLogin && passValidoMsg && (
    <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
      {passValidoMsg}
    </div>
  )}
</div>
{!modoLogin && (
           <>
   <div className="relative">
  <input
    type={verConfirmacion ? "text" : "password"}
    placeholder="Confirmar Contraseña"
    value={confirmar}
    onChange={(e) => setConfirmar(e.target.value)}
    className={`w-full px-4 py-3 pr-12 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border ${
      confirmarMsg ? "border-red-500" : "border-gray-300"
    }`}
    required
  />
  <button
    type="button"
    onClick={() => setVerConfirmacion(!verConfirmacion)}
    className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600"
  >
    {verConfirmacion ? "🙈" : "👁️"}
  </button>
  {confirmarMsg && (
    <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
      {confirmarMsg}
    </div>
  )}
</div>
  </>
)}
          {modoLogin && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                Recordar
              </label>
              <a href="#" className="hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#1E40AF] hover:bg-[#3B82F6] text-white py-3 rounded-md font-semibold uppercase tracking-wide text-sm transition"
          >
            {modoLogin ? "Ingresar" : "Registrarse"}
          </button>
        </form>

        {modoLogin && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 font-semibold mb-12">Usa tu cuenta</p>
            <div className="flex justify-center gap-20">
              <FaLinkedin size={40} className="text-black hover:text-blue-700 cursor-pointer" />
              <FaFacebookF size={40} className="text-black hover:text-blue-600 cursor-pointer" />
              <FaGoogle size={40} className="text-black hover:text-red-500 cursor-pointer" />
            </div>
          </div>
        )}
        {!modoLogin && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 font-semibold mb-6">Usa tu cuenta</p>
            <div className="flex justify-center gap-20">
              <FaLinkedin size={40} className="text-black hover:text-blue-700 cursor-pointer" />
              <FaFacebookF size={40} className="text-black hover:text-blue-600 cursor-pointer" />
              <FaGoogle size={40} className="text-black hover:text-red-500 cursor-pointer" />
            </div>
          </div>
        )}
      </div>
    </div>
     ) : ( // 📱 Vista móvil/tablet
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Imagen GIF superior */}
        <div className="w-full h-48 rounded-md overflow-hidden">
          <img
            src="/probar.gif"
            alt="GIF login"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="Logo" className="h-10" />
          <span className="text-2xl font-bold text-[#2C2F4A]">
            Omni<span className="text-blue-500">face</span>
          </span>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-center text-[#2C2F4A]">
          {modoLogin ? "Inicio de sesión" : "Registrarse"}
        </h2>

        {/* Formulario reutilizado */}
        <form onSubmit={manejarSubmit} className="space-y-4">
          {!modoLogin && (
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border border-gray-300"
              required
            />
          )}

          {/* Correo */}
          <div className="relative">
            <input
              type="email"
              placeholder="Correo Electrónico"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={`w-full px-4 py-3 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border pr-12 ${
                correoValidoMsg ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {correoValidoMsg && (
              <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
                {correoValidoMsg}
              </div>
            )}
          </div>

          {/* Contraseña */}
          <div className="relative">
            <input
              type={verPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border ${
                !modoLogin && passValidoMsg ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setVerPassword(!verPassword)}
              className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600"
            >
              {verPassword ? "🙈" : "👁️"}
            </button>
            {!modoLogin && passValidoMsg && (
              <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
                {passValidoMsg}
              </div>
            )}
          </div>

          {/* Confirmar Contraseña */}
          {!modoLogin && (
            <div className="relative">
              <input
                type={verConfirmacion ? "text" : "password"}
                placeholder="Confirmar Contraseña"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={`w-full px-4 py-3 pr-12 rounded-md bg-gray-100 text-gray-800 placeholder-gray-500 border ${
                  confirmarMsg ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setVerConfirmacion(!verConfirmacion)}
                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600"
              >
                {verConfirmacion ? "🙈" : "👁️"}
              </button>
              {confirmarMsg && (
                <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
                  {confirmarMsg}
                </div>
              )}
            </div>
          )}

          {/* Botón de acción */}
          <button
            type="submit"
            className="w-full bg-[#1E40AF] hover:bg-[#3B82F6] text-white py-3 rounded-md font-semibold uppercase tracking-wide text-sm transition"
          >
            {modoLogin ? "Ingresar" : "Registrarse"}
          </button>
        </form>

        {/* Botón de alternar */}
        <button
          onClick={() => {
            setModoLogin(!modoLogin);
            setError("");
          }}
          className="text-sm text-blue-600 hover:underline text-center block w-full"
        >
          {modoLogin
            ? "¿No tienes una cuenta? Regístrate"
            : "¿Ya tienes cuenta? Inicia sesión"}
        </button>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}
      </div>
)}
  </div>
  
  </div> 
);

}
