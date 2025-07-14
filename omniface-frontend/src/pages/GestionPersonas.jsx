import { useEffect, useState } from "react";
import api from "../api/api";
import {
  FaPlus, FaMagic, FaCheckCircle, FaTimesCircle, FaSpinner,
  FaRandom, FaTrash, FaEdit, FaTimes, FaSearch, FaUser,
  FaBuilding, FaClock, FaImage, FaIdCard
} from "react-icons/fa";
import ModalProgresoMejora from "../components/ModalProgresoMejora";

export default function GestionPersonas() {
  const [personas, setPersonas] = useState([]);
  const [personasFiltradas, setPersonasFiltradas] = useState({});
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [modalDepartamentosVisible, setModalDepartamentosVisible] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [nuevoDepartamento, setNuevoDepartamento] = useState({
    nombre: "",
    hora_temprano: "08:10",
    hora_tarde: "14:30"
  });
  const [departamentoAEliminar, setDepartamentoAEliminar] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [errorDep, setErrorDep] = useState("");

  const cargarDepartamentos = async () => {
    try {
      const res = await api.get("/departamentos/listar");
      console.log("Departamentos recibidos:", res.data);
      setDepartamentos(res.data.departamentos || []);
    } catch (err) {
      console.error("Error al listar departamentos:", err.response?.data || err.message);
    }
  };

  const guardarDepartamento = async () => {
    if (!nuevoDepartamento.nombre.trim()) {
      setErrorDep("El nombre es requerido");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("nombre", nuevoDepartamento.nombre.trim());
      formData.append("hora_temprano", nuevoDepartamento.hora_temprano + ":00");
      formData.append("hora_tarde", nuevoDepartamento.hora_tarde + ":00");

      if (editandoId) {
        await api.put(`/departamentos/modificar/${editandoId}`, formData);
      } else {
        await api.post("/departamentos/agregar", formData);
      }

      setNuevoDepartamento({ nombre: "", hora_temprano: "08:10", hora_tarde: "14:30" });
      setEditandoId(null);
      setErrorDep("");
      cargarDepartamentos();
    } catch (err) {
      setErrorDep(err.response?.data?.detail || "Error al guardar departamento.");
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

  const cargarPersonas = async () => {
    try {
      const res = await api.get("/personas/listar");
      const personas = res.data.personas || [];
      const agrupadas = personas.reduce((acc, p) => {
        const depId = p.departamentos_id || "sin_departamento";
        const depNombre = p.departamento || "Sin Departamento";
        if (!acc[depId]) {
          acc[depId] = { nombre: depNombre, personas: [] };
        }
        acc[depId].personas.push(p);
        return acc;
      }, {});
      setPersonas(personas);
      setPersonasFiltradas(agrupadas);
    } catch (err) {
      console.error("Error al cargar personas:", err);
    }
  };

  useEffect(() => {
    cargarPersonas();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const agrupadas = personas.reduce((acc, p) => {
      const depId = p.departamentos_id || "sin_departamento";
      const depNombre = p.departamento || "Sin Departamento";
      if (!acc[depId]) {
        acc[depId] = { nombre: depNombre, personas: [] };
      }
      if (busqueda.trim() === "" || p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())) {
        acc[depId].personas.push(p);
      }
      return acc;
    }, {});
    setPersonasFiltradas(
      Object.fromEntries(
        Object.entries(agrupadas).filter(([_, dep]) => dep.personas.length > 0)
      )
    );
  }, [busqueda, personas]);

  const generarCodigoAleatorio = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNuevaPersona({ ...nuevaPersona, codigo_app: result });
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
    setImagenPrevia(`http://192.168.0.104:8000${persona.imagen_url}`);
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

  return (
    <div className="relative p-4 md:p-6 bg-gradient-to-br from-[#f8fafc] to-[#eef2ff] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#1e2c4a] p-3 rounded-xl shadow-lg">
            <FaUser className="text-2xl text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e2c4a]">GESTIÓN DE PERSONAS</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-[#3b2f5e]" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#3b2f5e] focus:border-[#3b2f5e] bg-white shadow-sm"
            />
          </div>
          <button
            onClick={() => {
              setModalDepartamentosVisible(true);
              cargarDepartamentos();
            }}
            className="bg-gradient-to-r from-[#0d9488] to-[#14b8a6] hover:from-[#0f766e] hover:to-[#0d9488] text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200"
          >
            <FaBuilding className="inline" />
            <span>Departamento</span>
          </button>
          <button
            onClick={() => {
              setModalVisible(true);
              setModoEdicion(false);
              setNuevaPersona({ nombre_completo: "", departamentos_id: "", codigo_app: "", imagen: null });
              setImagenPrevia(null);
              cargarDepartamentos();
            }}
            className="bg-gradient-to-r from-[#3b2f5e] to-[#5b4b8a] hover:from-[#4a3a72] hover:to-[#3b2f5e] text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200"
          >
            <FaPlus className="inline" />
            <span>Agregar</span>
          </button>
          <button
            onClick={mejorarImagenes}
            className="bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] hover:from-[#2c3d6e] hover:to-[#1e2c4a] text-white px-4 py-2 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all duration-200"
            disabled={cargando}
          >
            {cargando ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaMagic className="inline" />
            )}
            <span>Mejorar</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(personasFiltradas).length > 0 ? (
          Object.entries(personasFiltradas).map(([depId, dep]) => (
            <div key={depId} className="bg-white rounded-xl shadow-lg border border-[#e0e7ff] p-4 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#3b2f5e] p-2 rounded-lg">
                  <FaBuilding className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1e2c4a]">{dep.nombre}</h3>
              </div>
              {isMobile ? (
                <div className="grid grid-cols-1 gap-4">
                  {dep.personas.map((p) => (
                    <div key={p.id} className="bg-gradient-to-r from-[#f8fafc] to-[#f0f4ff] rounded-lg p-4 shadow-sm border border-[#e0e7ff]">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={`http://192.168.0.104:8000${p.imagen_url}`}
                            alt="foto"
                            className="h-16 w-16 object-cover rounded-full border-4 border-[#a0c4ff] shadow-md"
                          />
                          {p.imagen_mejorada_listo && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                              <FaCheckCircle className="text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{p.nombre_completo}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <FaIdCard className="text-[#3b2f5e]" />
                            <span>Código: {p.codigo_app}</span>
                          </p>
                          <div className="mt-1">
                            {p.imagen_mejorada_listo ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <FaCheckCircle className="mr-1" /> Mejorada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                <FaTimesCircle className="mr-1" /> Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => iniciarEdicion(p)}
                            className="p-2 bg-gradient-to-r from-[#7fb3ff] to-[#91baff] hover:from-[#91baff] hover:to-[#7fb3ff] text-white rounded-lg shadow-sm transition-all duration-200"
                            title="Editar"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => confirmarEliminacion(p.id)}
                            className="p-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8787] hover:from-[#ff8787] hover:to-[#ff6b6b] text-white rounded-lg shadow-sm transition-all duration-200"
                            title="Eliminar"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#e0e7ff]">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Imagen</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Código App</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e0e7ff] bg-white">
                      {dep.personas.map((p) => (
                        <tr key={p.id} className="hover:bg-[#f8fafc] transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{p.nombre_completo}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="relative">
                              <img
                                src={`http://192.168.0.104:8000${p.imagen_url}`}
                                alt="foto"
                                className="h-12 w-12 object-cover rounded-full border-2 border-[#a0c4ff] shadow-sm"
                              />
                              {p.imagen_mejorada_listo && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                                  <FaCheckCircle className="text-xs" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-sm bg-[#f8fafc] text-[#3b2f5e] rounded">
                            {p.codigo_app}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.imagen_mejorada_listo ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                <FaCheckCircle className="mr-1" /> Mejorada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                <FaTimesCircle className="mr-1" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => iniciarEdicion(p)}
                                className="p-2 bg-gradient-to-r from-[#7fb3ff] to-[#91baff] hover:from-[#91baff] hover:to-[#7fb3ff] text-white rounded-lg shadow-sm transition-all duration-200"
                                title="Editar"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => confirmarEliminacion(p.id)}
                                className="p-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8787] hover:from-[#ff8787] hover:to-[#ff6b6b] text-white rounded-lg shadow-sm transition-all duration-200"
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
              )}
              {dep.personas.length === 0 && (
                <p className="text-center text-gray-500 py-4">No hay personas en este departamento</p>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto border border-[#e0e7ff]">
              <FaUser className="text-5xl text-[#3b2f5e] mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#1e2c4a] mb-2">
                {busqueda ? "No se encontraron resultados" : "No hay personas registradas"}
              </h3>
              <p className="text-gray-600">
                {busqueda ? "Intenta con otro término de búsqueda" : "Agrega nuevas personas para comenzar"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal para agregar/editar persona */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-[#a0c4ff]">
            <div className="flex justify-between items-center bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] p-4 rounded-t-xl sticky top-0 z-10">
              <h3 className="text-xl font-semibold text-white">
                {modoEdicion ? "Editar persona" : "Registrar nueva persona"}
              </h3>
              <button
                onClick={() => setModalVisible(false)}
                className="text-white hover:text-[#a0c4ff] transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={guardarPersona} className="p-6 space-y-6">
              {(imagenPrevia || nuevaPersona.imagen) && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={imagenPrevia}
                      alt="Vista previa"
                      className="h-40 w-40 object-cover rounded-full border-4 border-[#a0c4ff] shadow-lg"
                    />
                    {modoEdicion && imagenCambiada && (
                      <span className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
                        Nuevo
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                    <FaUser className="text-[#3b2f5e]" />
                    <span>Nombre completo</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={nuevaPersona.nombre_completo}
                    onChange={(e) => setNuevaPersona({ ...nuevaPersona, nombre_completo: e.target.value })}
                    className="w-full px-4 py-3 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#3b2f5e] focus:border-[#3b2f5e] transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                    <FaBuilding className="text-[#3b2f5e]" />
                    <span>Departamento</span>
                  </label>
                  <select
                    value={nuevaPersona.departamentos_id}
                    onChange={(e) =>
                      setNuevaPersona({ ...nuevaPersona, departamentos_id: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#3b2f5e] focus:border-[#3b2f5e] transition-all"
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
                  <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                    <FaIdCard className="text-[#3b2f5e]" />
                    <span>Código para App</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: ABC123"
                      value={nuevaPersona.codigo_app}
                      onChange={(e) => setNuevaPersona({ ...nuevaPersona, codigo_app: e.target.value })}
                      className="flex-1 px-4 py-3 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#3b2f5e] focus:border-[#3b2f5e] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={generarCodigoAleatorio}
                      className="bg-[#3b2f5e] text-white px-4 rounded-lg hover:bg-[#4a3a72] flex items-center transition-colors shadow-md"
                      title="Generar código"
                    >
                      <FaRandom />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                    <FaImage className="text-[#3b2f5e]" />
                    <span>{modoEdicion ? "Cambiar imagen (opcional)" : "Imagen (requerido)"}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer bg-gradient-to-r from-[#f8f9fa] to-[#f0f4ff] border border-[#a0c4ff] rounded-lg px-4 py-3 hover:bg-[#eef2ff] w-full transition-all flex items-center justify-center gap-2">
                      <span className="text-sm text-[#3b2f5e] font-medium">Seleccionar archivo</span>
                      <FaImage className="text-[#7fb3ff]" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        required={!modoEdicion}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 text-center">Formatos: JPG, PNG (Max. 5MB)</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e7ff]">
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="px-6 py-2 border border-[#a0c4ff] rounded-lg text-[#3b2f5e] hover:bg-[#f0f4ff] transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] text-white rounded-lg hover:from-[#4a3a72] hover:to-[#3b2f5e] transition-all font-medium shadow-md"
                >
                  {modoEdicion ? "Guardar cambios" : "Registrar persona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para departamentos */}
      {modalDepartamentosVisible && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#0d9488]">
            <div className="flex justify-between items-center bg-gradient-to-r from-[#0d9488] to-[#14b8a6] text-white p-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FaBuilding className="text-xl" />
                <h3 className="text-xl font-bold">Gestionar Departamentos</h3>
              </div>
              <button
                onClick={() => {
                  setModalDepartamentosVisible(false);
                  setNuevoDepartamento({ nombre: "", hora_temprano: "08:10", hora_tarde: "14:30" });
                  setEditandoId(null);
                  setErrorDep("");
                }}
                className="p-2 rounded-full hover:bg-[#0f766e] transition-colors"
              >
                <FaTimes className="text-lg" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4 bg-[#f8fafc] p-4 rounded-lg border border-[#e0e7ff]">
                <div>
                  <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                    <FaBuilding />
                    <span>Nombre del Departamento</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ventas"
                    value={nuevoDepartamento.nombre}
                    onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] transition-colors"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                      <FaClock />
                      <span>Hora Temprano</span>
                    </label>
                    <input
                      type="time"
                      value={nuevoDepartamento.hora_temprano}
                      onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, hora_temprano: e.target.value })}
                      className="w-full px-4 py-2 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] transition-colors"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#1e2c4a] mb-2 flex items-center gap-2">
                      <FaClock />
                      <span>Hora Tarde</span>
                    </label>
                    <input
                      type="time"
                      value={nuevoDepartamento.hora_tarde}
                      onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, hora_tarde: e.target.value })}
                      className="w-full px-4 py-2 border border-[#a0c4ff] rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] transition-colors"
                      required
                    />
                  </div>
                </div>
                {errorDep && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded-lg border border-red-100">{errorDep}</div>
                )}
                <button
                  onClick={guardarDepartamento}
                  className="w-full bg-gradient-to-r from-[#0d9488] to-[#14b8a6] hover:from-[#0f766e] hover:to-[#0d9488] text-white px-4 py-3 rounded-lg shadow-md transition-all duration-200 font-medium flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  {editandoId ? "Modificar Departamento" : "Agregar Departamento"}
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#e0e7ff] shadow-inner">
                <ul className="divide-y divide-[#e0e7ff]">
                  {departamentos.map((d) => (
                    <li key={d.id} className="flex justify-between items-center py-3 px-4 hover:bg-[#f8fafc] transition-colors">
                      <div>
                        <span className="text-gray-800 font-medium">{d.nombre}</span>
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <FaClock className="text-[#0d9488]" />
                          <span>Temprano: {d.hora_temprano.slice(0, 5)} | Tarde: {d.hora_tarde.slice(0, 5)}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setNuevoDepartamento({
                              nombre: d.nombre,
                              hora_temprano: d.hora_temprano.slice(0, 5),
                              hora_tarde: d.hora_tarde.slice(0, 5)
                            });
                            setEditandoId(d.id);
                            setErrorDep("");
                          }}
                          className="p-2 text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <FaEdit className="text-lg" />
                        </button>
                        <button
                          onClick={() => {
                            setErrorDep("");
                            setDepartamentoAEliminar(d);
                          }}
                          className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <FaTrash className="text-lg" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {departamentos.length === 0 && (
                    <div className="text-center p-6">
                      <FaBuilding className="text-3xl text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No hay departamentos aún.</p>
                    </div>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar departamento */}
      {departamentoAEliminar && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center border-2 border-[#ff6b6b]">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full shadow-inner border-4 border-red-200">
                <FaTimesCircle className="text-red-500 text-4xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#1e2c4a] mb-2">¿Eliminar este departamento?</h3>
            <p className="text-sm text-gray-600 mb-4">
              "{departamentoAEliminar.nombre}" será eliminado permanentemente.
            </p>
            {errorDep && (
              <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {errorDep}
              </div>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDepartamentoAEliminar(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex-1 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await eliminarDepartamento(departamentoAEliminar.id);
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8787] text-white rounded-lg hover:from-[#ff8787] hover:to-[#ff6b6b] flex-1 transition-colors font-medium"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de preparación para mejora de imágenes */}
      {preparandoMejora && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
          <div className="bg-gradient-to-br from-[#1e2c4a] to-[#3b2f5e] p-8 rounded-xl shadow-2xl w-full max-w-md text-center border-2 border-[#7fb3ff] animate-pulse">
            <div className="mb-6">
              <div className="bg-[#3b2f5e] p-4 rounded-full inline-block shadow-lg">
                <FaMagic className="text-4xl text-[#a0c4ff] animate-bounce" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[#a0c4ff] mb-3">Optimizando Imágenes</h3>
            <p className="text-[#91baff] mb-6">Estamos procesando tus imágenes para obtener la mejor calidad</p>
            <div className="w-full bg-[#1e2c4a] rounded-full h-3 mb-4 overflow-hidden border border-[#3b2f5e]">
              <div
                className="bg-gradient-to-r from-[#7fb3ff] to-[#8cc1ff] h-3 rounded-full transition-all duration-300"
                style={{ width: `${(15 - contadorPreparacion) * (100/15)}%` }}
              ></div>
            </div>
            <div className="flex justify-center items-center">
              <FaSpinner className="animate-spin text-2xl text-[#a0c4ff] mr-3" />
              <span className="text-xl font-medium text-[#91baff]">
                {contadorPreparacion > 0
                  ? `Iniciando en ${contadorPreparacion}s...`
                  : "Procesando..."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de mensaje sin pendientes */}
      {mensajeSinPendientes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="relative bg-white text-center p-6 rounded-xl shadow-2xl max-w-sm w-full border-2 border-[#a0c4ff]">
            <button
              onClick={() => setMensajeSinPendientes(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <FaTimes />
            </button>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full shadow-inner border-4 border-green-200">
                <FaCheckCircle className="text-green-500 text-4xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#1e2c4a] mb-2">¡Todo está listo!</h3>
            <p className="text-gray-600 text-sm mb-4">No hay imágenes pendientes por mejorar.</p>
            <button
              onClick={() => setMensajeSinPendientes(false)}
              className="px-4 py-2 bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] text-white rounded-lg hover:from-[#4a3a72] hover:to-[#3b2f5e] w-full transition-colors font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar persona */}
      {personaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center border-2 border-[#ff6b6b]">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full shadow-inner border-4 border-red-200">
                <FaTimesCircle className="text-red-500 text-4xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#1e2c4a] mb-2">¿Eliminar esta persona?</h3>
            <p className="text-sm text-gray-600 mb-4">Esta acción no se puede deshacer. Se eliminarán tanto la imagen original como la mejorada.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setPersonaAEliminar(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex-1 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarPersona}
                className="px-4 py-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8787] text-white rounded-lg hover:from-[#ff8787] hover:to-[#ff6b6b] flex-1 transition-colors font-medium"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}