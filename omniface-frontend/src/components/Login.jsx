// omniface-frontend/src/components/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { FaLinkedin, FaFacebookF, FaGoogle, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaCheckCircle } from "react-icons/fa";

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
          : "El correo no es válido"
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
          : "Al menos 8 caracteres, una mayúscula, una minúscula y un número"
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
          : "Las contraseñas no coinciden"
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
        setError("Credenciales incorrectas");
      }
    } else {
      try {
        const res = await api.post("/auth/registrar", {
          nombre,
          correo,
          contraseña,
        });
        console.log("Registro exitoso:", res.data);
        setModoLogin(true);
        setNombre("");
        setCorreo("");
        setContraseña("");
        setError("Registro exitoso. Ahora inicia sesión.");
      } catch (err) {
        if (err.response?.status === 409) {
          setCorreoValidoMsg("El correo ya está registrado");
        } else {
          setError("Error al registrar");
        }
      }
    }
  };

  function TextoAnimado({ texto }) {
    const [displayedText, setDisplayedText] = useState("");
    const [index, setIndex] = useState(0);
    const [borrando, setBorrando] = useState(false);

    useEffect(() => {
      const delay = borrando ? 20 : 50;
      const timeout = setTimeout(() => {
        if (!borrando) {
          setDisplayedText(texto.slice(0, index + 1));
          setIndex(index + 1);
          if (index + 1 === texto.length) {
            setTimeout(() => setBorrando(true), 1500);
          }
        } else {
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
      style={{ backgroundImage: "url('/fondo-login.jpg')" }}
    >
      {/* Capa desenfocada encima */}
      <div className="absolute inset-0 bg-[#000000]/50 backdrop-blur-sm z-0"></div>

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
                  modoLogin ? "" : "bg-[#3b2f5e]/70"
                } transform -translate-y-2`}
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
                  className="bg-[#3b2f5e] text-white px-12 py-3 text-lg rounded-xl shadow-lg hover:bg-white hover:text-[#3b2f5e] font-semibold transition-all duration-300 flex items-center"
                >
                  {modoLogin ? (
                    <>
                      <FaUser className="mr-2" /> Registrarse
                    </>
                  ) : (
                    <>
                      <FaLock className="mr-2" /> Iniciar sesión
                    </>
                  )}
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
                <img src="/logo.png" alt="Omniface Logo" className="h-12 mr-2" />
                <span className="text-3xl font-bold text-[#1e2c4a]">
                  Omni<span className="text-[#8cc1ff]">face</span>
                </span>
              </div>

              <h1 className="text-3xl font-bold text-[#1e2c4a] mb-6 text-center">
                {modoLogin ? "Inicio de sesión" : "Registrarse"}
              </h1>

              <form className="flex-grow space-y-4 flex flex-col justify-between" onSubmit={manejarSubmit}>
                {!modoLogin && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border border-gray-200 focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition"
                      required
                    />
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-500" />
                  </div>
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${
                      correoValidoMsg ? "border-red-500" : "border-gray-200"
                    } focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition`}
                    required
                  />
                  {correoValidoMsg && (
                    <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-3 py-1 rounded-lg shadow-md z-50 whitespace-nowrap flex items-center">
                      <FaCheckCircle className="mr-1" /> {correoValidoMsg}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-500" />
                  </div>
                  <input
                    type={verPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    value={contraseña}
                    onChange={(e) => setContraseña(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${
                      !modoLogin && passValidoMsg ? "border-red-500" : "border-gray-200"
                    } focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(!verPassword)}
                    className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-[#1e2c4a]"
                  >
                    {verPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  {!modoLogin && passValidoMsg && (
                    <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-3 py-1 rounded-lg shadow-md z-50 whitespace-nowrap flex items-center">
                      <FaCheckCircle className="mr-1" /> {passValidoMsg}
                    </div>
                  )}
                </div>

                {!modoLogin && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-500" />
                    </div>
                    <input
                      type={verConfirmacion ? "text" : "password"}
                      placeholder="Confirmar contraseña"
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      className={`w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${
                        confirmarMsg ? "border-red-500" : "border-gray-200"
                      } focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmacion(!verConfirmacion)}
                      className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-[#1e2c4a]"
                    >
                      {verConfirmacion ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    {confirmarMsg && (
                      <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-3 py-1 rounded-lg shadow-md z-50 whitespace-nowrap flex items-center">
                        <FaCheckCircle className="mr-1" /> {confirmarMsg}
                      </div>
                    )}
                  </div>
                )}

                {modoLogin && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" className="mr-2 rounded text-[#8cc1ff] focus:ring-[#8cc1ff]" />
                      Recordar sesión
                    </label>
                    <a href="#" className="hover:underline text-[#8cc1ff] hover:text-[#3b2f5e]">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                )}

                {error && (
                  <div className={`text-sm p-3 rounded-lg ${
                    error.includes("exit") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  } flex items-center`}>
                    <FaCheckCircle className={`mr-2 ${error.includes("exit") ? "text-green-500" : "text-red-500"}`} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] hover:from-[#1e2c4a] hover:to-[#3b2f5e] text-white py-3 rounded-lg font-semibold uppercase tracking-wide text-sm transition-all shadow-lg hover:shadow-xl"
                >
                  {modoLogin ? "Ingresar" : "Crear cuenta"}
                </button>
              </form>

              {modoLogin && (
                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600 font-medium mb-4">O inicia sesión con</p>
                  <div className="flex justify-center gap-6">
                    <button className="p-3 bg-[#0077B5] text-white rounded-full hover:bg-[#006097] transition">
                      <FaLinkedin size={20} />
                    </button>
                    <button className="p-3 bg-[#4267B2] text-white rounded-full hover:bg-[#365899] transition">
                      <FaFacebookF size={20} />
                    </button>
                    <button className="p-3 bg-[#DB4437] text-white rounded-full hover:bg-[#C1351B] transition">
                      <FaGoogle size={20} />
                    </button>
                  </div>
                </div>
              )}
              {!modoLogin && (
                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600 font-medium mb-4">O regístrate con</p>
                  <div className="flex justify-center gap-6">
                    <button className="p-3 bg-[#0077B5] text-white rounded-full hover:bg-[#006097] transition">
                      <FaLinkedin size={20} />
                    </button>
                    <button className="p-3 bg-[#4267B2] text-white rounded-full hover:bg-[#365899] transition">
                      <FaFacebookF size={20} />
                    </button>
                    <button className="p-3 bg-[#DB4437] text-white rounded-full hover:bg-[#C1351B] transition">
                      <FaGoogle size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-6">
            {/* Imagen GIF superior */}
            <div className="w-full h-48 rounded-xl overflow-hidden shadow-md">
              <img
                src={modoLogin ? "/probar.gif" : "/cara.png"}
                alt="Login visual"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Logo */}
            <div className="flex justify-center items-center mb-4">
              <img src="/logo.png" alt="Logo" className="h-10 mr-2" />
              <span className="text-2xl font-bold text-[#1e2c4a]">
                Omni<span className="text-[#8cc1ff]">face</span>
              </span>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-center text-[#1e2c4a]">
              {modoLogin ? "Inicio de sesión" : "Registrarse"}
            </h2>

            {/* Formulario */}
            <form onSubmit={manejarSubmit} className="space-y-4">
              {!modoLogin && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-gray-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border border-gray-200 focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-500" />
                </div>
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${
                    correoValidoMsg ? "border-red-500" : "border-gray-200"
                  } focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition`}
                  required
                />
                {correoValidoMsg && (
                  <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-3 py-1 rounded-lg shadow-md z-50 whitespace-nowrap flex items-center">
                    <FaCheckCircle className="mr-1" /> {correoValidoMsg}
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-500" />
                </div>
                <input
                  type={verPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={contraseña}
                  onChange={(e) => setContraseña(e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${
                    !modoLogin && passValidoMsg ? "border-red-500" : "border-gray-200"
                  } focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-[#1e2c4a]"
                >
                  {verPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                {!modoLogin && passValidoMsg && (
                  <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-3 py-1 rounded-lg shadow-md z-50 whitespace-nowrap flex items-center">
                    <FaCheckCircle className="mr-1" /> {passValidoMsg}
                  </div>
                )}
              </div>

              {!modoLogin && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-500" />
                  </div>
                  <input
                    type={verConfirmacion ? "text" : "password"}
                    placeholder="Confirmar contraseña"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-500 border ${
                      confirmarMsg ? "border-red-500" : "border-gray-200"
                    } focus:border-[#8cc1ff] focus:ring-2 focus:ring-[#8cc1ff]/30 transition`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVerConfirmacion(!verConfirmacion)}
                    className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-600 hover:text-[#1e2c4a]"
                  >
                    {verConfirmacion ? <FaEyeSlash /> : <FaEye />}
                  </button>
                  {confirmarMsg && (
                    <div className="absolute top-full mt-1 left-0 bg-red-500 text-white text-xs px-3 py-1 rounded-lg shadow-md z-50 whitespace-nowrap flex items-center">
                      <FaCheckCircle className="mr-1" /> {confirmarMsg}
                    </div>
                  )}
                </div>
              )}

              {modoLogin && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" className="mr-2 rounded text-[#8cc1ff] focus:ring-[#8cc1ff]" />
                    Recordar sesión
                  </label>
                  <a href="#" className="hover:underline text-[#8cc1ff] hover:text-[#3b2f5e]">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              )}

              {error && (
                <div className={`text-sm p-3 rounded-lg ${
                  error.includes("exit") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                } flex items-center`}>
                  <FaCheckCircle className={`mr-2 ${error.includes("exit") ? "text-green-500" : "text-red-500"}`} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] hover:from-[#1e2c4a] hover:to-[#3b2f5e] text-white py-3 rounded-lg font-semibold uppercase tracking-wide text-sm transition-all shadow-lg hover:shadow-xl"
              >
                {modoLogin ? "Ingresar" : "Crear cuenta"}
              </button>
            </form>

            <button
              onClick={() => {
                setModoLogin(!modoLogin);
                setError("");
              }}
              className="text-sm text-[#8cc1ff] hover:text-[#3b2f5e] hover:underline text-center block w-full"
            >
              {modoLogin
                ? "¿No tienes una cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600 font-medium mb-3">O continúa con</p>
              <div className="flex justify-center gap-4">
                <button className="p-2 bg-[#0077B5] text-white rounded-full hover:bg-[#006097] transition">
                  <FaLinkedin size={18} />
                </button>
                <button className="p-2 bg-[#4267B2] text-white rounded-full hover:bg-[#365899] transition">
                  <FaFacebookF size={18} />
                </button>
                <button className="p-2 bg-[#DB4437] text-white rounded-full hover:bg-[#C1351B] transition">
                  <FaGoogle size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}