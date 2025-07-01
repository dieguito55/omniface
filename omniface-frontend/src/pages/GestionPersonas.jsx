// omniface-frontend/src/pages/GestionPersonas.jsx
import { useEffect, useState } from "react";
import api from "../api/api";
import {
  FaPlus, FaMagic, FaCheckCircle, FaTimesCircle, FaSpinner
} from "react-icons/fa";
import ModalProgresoMejora from "../components/ModalProgresoMejora";

export default function GestionPersonas() {
  const [personas, setPersonas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevaPersona, setNuevaPersona] = useState({
    nombre_completo: "",
    departamento: "",
    codigo_app: "",
    imagen: null,
  });
  const [imagenCambiada, setImagenCambiada] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [totalPendientes, setTotalPendientes] = useState(0);
  const [personaAEliminar, setPersonaAEliminar] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [personaAEditar, setPersonaAEditar] = useState(null);
const [listaEnProceso, setListaEnProceso] = useState([]);
const [mostrarProgresoDetallado, setMostrarProgresoDetallado] = useState(false);
const [preparandoMejora, setPreparandoMejora] = useState(false);
const [contadorPreparacion, setContadorPreparacion] = useState(5); // inicia en 5 segundos
const [mensajeSinPendientes, setMensajeSinPendientes] = useState(false);

  const cargarPersonas = async () => {
    try {
      const res = await api.get("/personas/listar");
      setPersonas(res.data.personas || []);
    } catch (err) {
      console.error("Error al cargar personas:", err);
    }
  };

  useEffect(() => {
    cargarPersonas();
  }, []);

  const iniciarEdicion = (persona) => {
    setModoEdicion(true);
    setModalVisible(true);
    setPersonaAEditar(persona.id);
    setNuevaPersona({
      nombre_completo: persona.nombre_completo,
      departamento: persona.departamento,
      codigo_app: persona.codigo_app,
      imagen: null,
    });
  };

  const guardarPersona = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("nombre_completo", nuevaPersona.nombre_completo);
    formData.append("departamento", nuevaPersona.departamento);
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
      setNuevaPersona({ nombre_completo: "", departamento: "", codigo_app: "", imagen: null });
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
  setContadorPreparacion(15); // reinicia el contador

  // Empieza contador visual
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

  return (
    <div className="relative">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#2C2F4A]">Gestión de Personas</h2>
        <div className="space-x-3">
          <button
            onClick={() => {
              setModalVisible(true);
              setModoEdicion(false);
              setNuevaPersona({ nombre_completo: "", departamento: "", codigo_app: "", imagen: null });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-md"
          >
            <FaPlus className="inline mr-2" />
            Agregar Persona
          </button>
          <button
            onClick={mejorarImagenes}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-md"
            disabled={cargando}
          >
            <FaMagic className="inline mr-2" />
            Mejorar Imágenes
          </button>
        </div>
      </div>

      {/* Tabla */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="px-4 py-2">#</th>
            <th>Nombre</th>
            <th>Imagen</th>
            <th>Departamento</th>
            <th>Código App</th>
            <th>¿Mejorada?</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {personas.map((p, index) => (
            <tr key={p.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{index + 1}</td>
              <td>{p.nombre_completo}</td>
              <td>
                <img
                  src={`http://192.168.100.42:8000${p.imagen_url}`}
                  alt="foto"
                  className="h-16 w-16 object-cover rounded-full border shadow"
                />
              </td>
              <td>{p.departamento}</td>
              <td>{p.codigo_app}</td>
              <td>
                {p.imagen_mejorada_listo ? (
                  <FaCheckCircle className="text-green-500 text-xl" />
                ) : (
                  <FaTimesCircle className="text-red-500 text-xl" />
                )}
              </td>
              <td className="flex gap-2">
                <button
                  onClick={() => iniciarEdicion(p)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => confirmarEliminacion(p.id)}
                  className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-sm"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal: Registrar o Editar Persona */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">
              {modoEdicion ? "Editar persona" : "Registrar nueva persona"}
            </h3>
            <form onSubmit={guardarPersona} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre completo"
                value={nuevaPersona.nombre_completo}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, nombre_completo: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Departamento"
                value={nuevaPersona.departamento}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, departamento: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="text"
                placeholder="Código para App"
                value={nuevaPersona.codigo_app}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, codigo_app: e.target.value })}
                className="w-full px-4 py-2 border rounded"
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setNuevaPersona({ ...nuevaPersona, imagen: e.target.files[0] });
                  if (modoEdicion) setImagenCambiada(true); // solo marcar si está editando
                }}
                className="w-full"
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                  {modoEdicion ? "Guardar Cambios" : "Registrar"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalVisible(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                >
                  Cancelar
                </button>
              </div>
            </form>
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
{preparandoMejora && (
  <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex flex-col justify-center items-center text-white">
    <div className="bg-[#1E293B] p-6 rounded-xl shadow-lg w-full max-w-sm flex flex-col items-center space-y-4">
      <FaSpinner className="animate-spin text-4xl text-yellow-400" />
      <h3 className="text-lg font-bold">Preparando mejora de imágenes...</h3>
      <p className="text-sm text-gray-300">Analizando imágenes pendientes</p>
      <p className="text-yellow-300 font-mono text-lg">
        Espera {contadorPreparacion} segundo{contadorPreparacion !== 1 && "s"}...
      </p>
    </div>
  </div>
)}

{mensajeSinPendientes && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
    <div className="relative bg-white text-center p-8 rounded-xl shadow-2xl max-w-sm w-full border border-gray-200">
      {/* Botón cerrar */}
      <button
        onClick={() => setMensajeSinPendientes(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl"
      >
        &times;
      </button>

      {/* Ícono grande */}
      <div className="flex justify-center mb-4">
        <div className="bg-green-100 p-4 rounded-full shadow-inner">
          <FaCheckCircle className="text-green-500 text-4xl" />
        </div>
      </div>

      {/* Texto principal */}
      <h3 className="text-xl font-bold text-[#1F2937] mb-2">Todo está listo</h3>
      <p className="text-gray-600 text-sm">No hay imágenes pendientes por mejorar.</p>
    </div>
  </div>
)}


      {/* Modal Confirmar Eliminación */}
      {personaAEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm text-center">
            <h3 className="text-lg font-bold mb-4">¿Eliminar esta persona?</h3>
            <p className="text-sm mb-4">Esta acción eliminará la imagen original y la mejorada si existe.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={eliminarPersona}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setPersonaAEliminar(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
