// omniface-frontend/src/pages/GestionPersonas.jsx
import { useEffect, useState } from "react";
import api from "../api/api";
import {
  FaPlus, FaMagic, FaCheckCircle, FaTimesCircle, FaSpinner,
  FaRandom, FaTrash, FaEdit, FaTimes, FaSearch, FaArrowLeft, FaArrowRight
} from "react-icons/fa";
import ModalProgresoMejora from "../components/ModalProgresoMejora";

export default function GestionPersonas() {
  const [personas, setPersonas] = useState([]);
  const [personasFiltradas, setPersonasFiltradas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevaPersona, setNuevaPersona] = useState({
    nombre_completo: "",
    departamentos_id: "", 
    codigo_app: "",
    imagen: null,
  });
  const [imagenCambiada, setImagenCambiada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [personaAEliminar, setPersonaAEliminar] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [personaAEditar, setPersonaAEditar] = useState(null);
  const [listaEnProceso, setListaEnProceso] = useState([]);
  const [mostrarProgresoDetallado, setMostrarProgresoDetallado] = useState(false);
  const [preparandoMejora, setPreparandoMejora] = useState(false);
  const [contadorPreparacion, setContadorPreparacion] = useState(5);
  const [mensajeSinPendientes, setMensajeSinPendientes] = useState(false);
  const [imagenPrevia, setImagenPrevia] = useState(null);
  const [indiceCardActual, setIndiceCardActual] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [modalDepartamentosVisible, setModalDepartamentosVisible] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [nuevoDepartamento, setNuevoDepartamento] = useState("");
  const [departamentoAEliminar, setDepartamentoAEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);   // null = modo agregar
  const [errorDep, setErrorDep] = useState("");   // ← para mensajes de error

  const cargarDepartamentos = async () => {
  try {
    const res = await api.get("/departamentos/listar");
    setDepartamentos(res.data.departamentos || []);
  } catch (err) {
    console.error("Error al listar departamentos:", err);
  }
};
const guardarDepartamento = async () => {
  if (!nuevoDepartamento.trim()) return;
  try {
    const formData = new FormData();
    formData.append("nombre", nuevoDepartamento.trim());

    if (editandoId) {
      await api.put(`/departamentos/modificar/${editandoId}`, formData);
    } else {
      await api.post("/departamentos/agregar", formData);
    }

    setNuevoDepartamento("");
    setEditandoId(null);
    cargarDepartamentos();
  } catch (err) {
    alert(err.response?.data?.detail || "Error al guardar.");
  }
};

const eliminarDepartamento = async (id) => {
  try {
    await api.delete(`/departamentos/eliminar/${id}`);
    setErrorDep("");
    cargarDepartamentos();
    setDepartamentoAEliminar(null);
  } catch (err) {
    console.error("Error al eliminar departamento:", err);
    setErrorDep(err.response?.data?.detail || "Error al eliminar.");
  }
};

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cargarPersonas = async () => {
    try {
      const res = await api.get("/personas/listar");
      setPersonas(res.data.personas || []);
      setPersonasFiltradas(res.data.personas || []);
    } catch (err) {
      console.error("Error al cargar personas:", err);
    }
  };

  useEffect(() => {
    cargarPersonas();
  }, []);

  useEffect(() => {
    if (busqueda.trim() === "") {
      setPersonasFiltradas(personas);
    } else {
      const filtradas = personas.filter(persona =>
        persona.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
      );
      setPersonasFiltradas(filtradas);
      if (isMobile && filtradas.length > 0) {
        setIndiceCardActual(0);
      }
    }
  }, [busqueda, personas]);

  const generarCodigoAleatorio = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNuevaPersona({...nuevaPersona, codigo_app: result});
  };
 
  const iniciarEdicion = (persona) => {
    setModoEdicion(true);
    setModalVisible(true);
    setPersonaAEditar(persona.id);
    setNuevaPersona({
      nombre_completo: persona.nombre_completo,
      departamentos_id: persona.departamentos_id,
      codigo_app: persona.codigo_app,
      imagen: null,
    });
    setImagenPrevia(`http://192.168.108.121:8000${persona.imagen_url}`);
    cargarDepartamentos();

  };

  const guardarPersona = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nombre_completo", nuevaPersona.nombre_completo);
    formData.append("departamentos_id", nuevaPersona.departamentos_id);
    formData.append("codigo_app", nuevaPersona.codigo_app);
    
    if (nuevaPersona.imagen) {
      formData.append("imagen", nuevaPersona.imagen);
    }
    formData.append("imagen_cambiada", imagenCambiada ? "true" : "false");

    try {
      if (modoEdicion) {
        await api.put(`/personas/modificar/${personaAEditar}`, formData);
      } else {
        formData.append("imagen", nuevaPersona.imagen);
        await api.post("/personas/registrar", formData);
      }

      setModalVisible(false);
      setNuevaPersona({ nombre_completo: "", departamentos_id: "", codigo_app: "", imagen: null });
      setImagenPrevia(null);
      setModoEdicion(false);
      setPersonaAEditar(null);
      cargarPersonas();
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      alert("Error al guardar persona.");
    }
  };

  const mejorarImagenes = async () => {
    setPreparandoMejora(true);
    setCargando(true);
    setProgreso(0);
    setContadorPreparacion(15);

    const interval = setInterval(() => {
      setContadorPreparacion((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const res = await api.post("/personas/mejorar");
      const total = res.data.total || 0;
      const archivos = res.data.archivos || [];

      if (total === 0) {
        setPreparandoMejora(false);
        setCargando(false);
        setMensajeSinPendientes(true);
        return;
      }

      setListaEnProceso(archivos);
      setMostrarProgresoDetallado(true);
    } catch (err) {
      console.error("Error al mejorar imágenes:", err);
      alert("Error al iniciar mejora.");
    } finally {
      setPreparandoMejora(false);
    }
  };

  const confirmarEliminacion = (id) => {
    setPersonaAEliminar(id);
  };

  const eliminarPersona = async () => {
    try {
      await api.delete(`/personas/eliminar/${personaAEliminar}`);
      setPersonaAEliminar(null);
      cargarPersonas();
    } catch (err) {
      console.error("Error al eliminar persona:", err);
      alert("Error al eliminar persona.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNuevaPersona({ ...nuevaPersona, imagen: file });
      if (modoEdicion) setImagenCambiada(true);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPrevia(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const siguienteCard = () => {
    if (indiceCardActual < personasFiltradas.length - 1) {
      setIndiceCardActual(indiceCardActual + 1);
    }
  };

  const anteriorCard = () => {
    if (indiceCardActual > 0) {
      setIndiceCardActual(indiceCardActual - 1);
    }
  };

  return (
    <div className="relative p-4 md:p-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-[#1e2c4a]">GÉSTION DE PERSONAS</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Buscador */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7fb3ff] focus:border-[#7fb3ff]"
            />
          </div>
          <button
            onClick={() => {
                  setModalDepartamentosVisible(true);
                  cargarDepartamentos();
                }}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-center"
          >
            <FaPlus className="inline mr-2" />
            Departamento
          </button>
          
          <button
            onClick={() => {
              setModalVisible(true);
              setModoEdicion(false);
              setNuevaPersona({ nombre_completo: "", departamentos_id: "", codigo_app: "", imagen: null });
              setImagenPrevia(null);
              cargarDepartamentos(); 
            }}
            className="bg-[#3b2f5e] hover:bg-[#4a3a72] text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-center"
          >
            <FaPlus className="inline mr-2" />
            Agregar
          </button>
          <button
            onClick={mejorarImagenes}
            className="bg-[#1e2c4a] hover:bg-[#2c3d6e] text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-center"
            disabled={cargando}
          >
            {cargando ? (
              <FaSpinner className="inline mr-2 animate-spin" />
            ) : (
              <FaMagic className="inline mr-2" />
            )}
            Mejorar
          </button>
        </div>
      </div>

      {/* Vista para móvil (Cards) */}
      {isMobile ? (
        <div className="relative">
          {personasFiltradas.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-4">
                <button 
                  onClick={anteriorCard}
                  disabled={indiceCardActual === 0}
                  className={`p-2 rounded-full ${indiceCardActual === 0 ? 'text-gray-400' : 'text-[#3b2f5e] hover:bg-gray-100'}`}
                >
                  <FaArrowLeft size={20} />
                </button>
                
                <div className="mx-4 w-full max-w-xs">
                  <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                    <div className="flex justify-center p-4">
                      <img
                        src={`http://192.168.108.121:8000${personasFiltradas[indiceCardActual].imagen_url}`}
                        alt="foto"
                        className="h-32 w-32 object-cover rounded-full border-4 border-[#a0c4ff] shadow-sm"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-center text-[#1e2c4a]">
                        {personasFiltradas[indiceCardActual].nombre_completo}
                      </h3>
                      <div className="mt-2 text-sm text-gray-600 text-center">
                        <p><span className="font-semibold">Departamento:</span> {personasFiltradas[indiceCardActual].departamento}</p>
                        <p><span className="font-semibold">Código:</span> {personasFiltradas[indiceCardActual].codigo_app}</p>
                        <div className="mt-2 flex justify-center">
                          {personasFiltradas[indiceCardActual].imagen_mejorada_listo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FaCheckCircle className="mr-1" /> Mejorada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <FaTimesCircle className="mr-1" /> Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-center gap-2">
                        <button
                          onClick={() => iniciarEdicion(personasFiltradas[indiceCardActual])}
                          className="bg-[#7fb3ff] hover:bg-[#91baff] text-white p-2 rounded-lg"
                          title="Editar"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => confirmarEliminacion(personasFiltradas[indiceCardActual].id)}
                          className="bg-[#ff6b6b] hover:bg-[#ff8787] text-white p-2 rounded-lg"
                          title="Eliminar"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={siguienteCard}
                  disabled={indiceCardActual === personasFiltradas.length - 1}
                  className={`p-2 rounded-full ${indiceCardActual === personasFiltradas.length - 1 ? 'text-gray-400' : 'text-[#3b2f5e] hover:bg-gray-100'}`}
                >
                  <FaArrowRight size={20} />
                </button>
              </div>
              <div className="text-center text-sm text-gray-500 mt-2">
                {indiceCardActual + 1} de {personasFiltradas.length}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {busqueda ? "No se encontraron resultados" : "No hay personas registradas"}
            </div>
          )}
        </div>
      ) : (
        /* Vista para desktop (Tabla) */
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
            <table className="w-full">
              <thead className="sticky top-0 bg-[#1e2c4a] text-white">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Imagen</th>
                  <th className="px-4 py-3 text-left">Departamento</th>
                  <th className="px-4 py-3 text-left">Código App</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {personasFiltradas.map((p, index) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.nombre_completo}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={`http://192.168.108.121:8000${p.imagen_url}`}
                          alt="foto"
                          className="h-12 w-12 md:h-16 md:w-16 object-cover rounded-full border-2 border-[#a0c4ff] shadow-sm"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{p.departamento}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">{p.codigo_app}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.imagen_mejorada_listo ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <FaCheckCircle className="mr-1" /> Mejorada
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <FaTimesCircle className="mr-1" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => iniciarEdicion(p)}
                          className="bg-[#7fb3ff] hover:bg-[#91baff] text-white p-2 rounded-lg"
                          title="Editar"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => confirmarEliminacion(p.id)}
                          className="bg-[#ff6b6b] hover:bg-[#ff8787] text-white p-2 rounded-lg"
                          title="Eliminar"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {personasFiltradas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {busqueda ? "No se encontraron resultados" : "No hay personas registradas"}
            </div>
          )}
        </div>
      )}

      {/* Modal: Registrar o Editar Persona */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b p-4 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold text-[#1e2c4a]">
                {modoEdicion ? "Editar persona" : "Registrar nueva persona"}
              </h3>
              <button 
                onClick={() => setModalVisible(false)
                }
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={guardarPersona} className="p-6 space-y-4">
              {(imagenPrevia || nuevaPersona.imagen) && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={imagenPrevia}
                      alt="Vista previa"
                      className="h-32 w-32 object-cover rounded-full border-4 border-[#a0c4ff] shadow-md"
                    />
                    {modoEdicion && imagenCambiada && (
                      <span className="absolute top-0 right-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        Nuevo
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nuevaPersona.nombre_completo}
                  onChange={(e) => setNuevaPersona({ ...nuevaPersona, nombre_completo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7fb3ff] focus:border-[#7fb3ff]"
                  required
                />
              </div>
              
              <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={nuevaPersona.departamentos_id}
              onChange={(e) =>
                setNuevaPersona({ ...nuevaPersona, departamentos_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7fb3ff] focus:border-[#7fb3ff]"
              required
            >
              <option value="">Selecciona un departamento</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código para App</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: ABC123"
                    value={nuevaPersona.codigo_app}
                    onChange={(e) => setNuevaPersona({ ...nuevaPersona, codigo_app: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7fb3ff] focus:border-[#7fb3ff]"
                    required
                  />
                  <button
                    type="button"
                    onClick={generarCodigoAleatorio}
                    className="bg-[#3b2f5e] text-white px-3 rounded-lg hover:bg-[#4a3a72] flex items-center"
                    title="Generar código"
                  >
                    <FaRandom />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modoEdicion ? "Cambiar imagen (opcional)" : "Imagen (requerido)"}
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-[#f8f9fa] border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 w-full">
                    <span className="text-sm text-gray-700">Seleccionar archivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      required={!modoEdicion}
                    />
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">Formatos: JPG, PNG (Max. 5MB)</p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3b2f5e] text-white rounded-lg hover:bg-[#4a3a72]"
                >
                  {modoEdicion ? "Guardar cambios" : "Registrar persona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Progreso de Mejora */}
      {mostrarProgresoDetallado && (
        <ModalProgresoMejora
          lista={listaEnProceso}
          onCompletar={() => {
            setMostrarProgresoDetallado(false);
            setCargando(false);
            cargarPersonas();
          }}
        />
      )}
      
      {/* Pantalla de Preparación */}
      {preparandoMejora && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
          <div className="bg-[#1e2c4a] p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-[#3b2f5e]">
            <div className="animate-pulse mb-6">
              <FaMagic className="text-5xl text-[#a0c4ff] mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-[#a0c4ff] mb-3">Optimizando Imágenes</h3>
            <p className="text-gray-300 mb-6">Estamos procesando tus imágenes para obtener la mejor calidad</p>
            
            <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
              <div 
                className="bg-[#7fb3ff] h-4 rounded-full transition-all duration-300" 
                style={{ width: `${(15 - contadorPreparacion) * (100/15)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-center items-center">
              <FaSpinner className="animate-spin text-2xl text-[#a0c4ff] mr-3" />
              <span className="text-xl font-mono">
                {contadorPreparacion > 0 ? 
                  `Iniciando en ${contadorPreparacion}s...` : 
                  "Procesando..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje Sin Pendientes */}
      {mensajeSinPendientes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="relative bg-white text-center p-6 rounded-xl shadow-2xl max-w-sm w-full border border-[#a0c4ff]">
            <button
              onClick={() => setMensajeSinPendientes(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              <FaTimes />
            </button>

            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full shadow-inner border-2 border-green-200">
                <FaCheckCircle className="text-green-500 text-4xl" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-[#1e2c4a] mb-2">¡Todo está listo!</h3>
            <p className="text-gray-600 text-sm mb-4">No hay imágenes pendientes por mejorar.</p>
            <button
              onClick={() => setMensajeSinPendientes(false)}
              className="px-4 py-2 bg-[#3b2f5e] text-white rounded-lg hover:bg-[#4a3a72] w-full"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {personaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center border border-[#ff6b6b]">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full shadow-inner border-2 border-red-200">
                <FaTimesCircle className="text-red-500 text-4xl" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-[#1e2c4a] mb-2">¿Eliminar esta persona?</h3>
            <p className="text-sm text-gray-600 mb-6">Esta acción no se puede deshacer. Se eliminarán tanto la imagen original como la mejorada.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setPersonaAEliminar(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarPersona}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {modalDepartamentosVisible && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      <div className="flex justify-between items-center border-b p-4">
        <h3 className="text-lg font-semibold text-[#1e2c4a]">Gestionar Departamentos</h3>
        <button
          onClick={() => {
  setModalDepartamentosVisible(false);
  setNuevoDepartamento("");
  setEditandoId(null);
}}
          className="text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* ➕ Campo para agregar nuevo */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nuevo departamento"
            value={nuevoDepartamento}
            onChange={(e) => setNuevoDepartamento(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d9488]"
          />

         <button
    onClick={guardarDepartamento}
    className="bg-[#0d9488] hover:bg-[#0f766e] text-white px-4 py-2 rounded-lg"
  >
    {editandoId ? "Modificar" : "Agregar"}
  </button>
        </div>

        {/* 📋 Lista de departamentos */}
        <ul className="divide-y divide-gray-200">
           {departamentos.map((d) => (
    <li key={d.id} className="flex justify-between items-center py-2">
      <span className="text-gray-800">{d.nombre}</span>
      <div className="flex gap-3">
        {/* Editar */}
        <button
          onClick={() => {
            setNuevoDepartamento(d.nombre);
            setEditandoId(d.id);       // ← activa modo editar
          }}
          className="text-blue-500 hover:text-blue-700"
          title="Editar"
        >
          <FaEdit />
        </button>
        {/* Eliminar */}
        <button
          onClick={() => {
            setErrorDep("");            // ← limpia mensaje anterior
            setDepartamentoAEliminar(d); // ← abre el modal
          }}
          className="text-red-500 hover:text-red-700"
          title="Eliminar"
        >
          <FaTrash />
        </button>
      </div>
    </li>
  ))}
          {departamentos.length === 0 && (
            <p className="text-gray-500 text-sm">No hay departamentos aún.</p>
          )}
        </ul>
      </div>
    </div>
  </div>
)}
{departamentoAEliminar && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center border border-[#ff6b6b]">
      <div className="flex justify-center mb-4">
        <div className="bg-red-100 p-4 rounded-full shadow-inner border-2 border-red-200">
          <FaTimesCircle className="text-red-500 text-4xl" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-[#1e2c4a] mb-2">¿Eliminar este departamento?</h3>
      <p className="text-sm text-gray-600 mb-6">
        "{departamentoAEliminar.nombre}" será eliminado permanentemente.
      </p>
      {errorDep && (
  <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
    {errorDep}
  </div>
)}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setDepartamentoAEliminar(null)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex-1"
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            await eliminarDepartamento(departamentoAEliminar.id); 
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1"
        >
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
)}
    </div>);
}