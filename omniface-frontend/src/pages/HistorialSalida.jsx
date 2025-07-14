import { useEffect, useState } from "react";
import api from "../api/api";
import { FaSearch, FaHistory, FaUndo, FaUser, FaUsers, FaCalendarAlt, FaClock, FaBuilding, FaSignOutAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function HistorialSalida() {
  const [datos, setDatos] = useState([]);
  const [filteredDatos, setFilteredDatos] = useState([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterName, setFilterName] = useState("");
  const [viewMode, setViewMode] = useState("today");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const payload = JSON.parse(atob(token.split('.')[1]));
    const usuario_id = payload.id;

    setIsLoading(true);
    api.get(`/salida/dia/${usuario_id}`)
      .then(r => {
        setDatos(r.data);
        applyFilters(r.data);
      })
      .catch(() => setDatos([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    applyFilters(datos);
  }, [filterDate, filterName, viewMode, selectedPerson, datos]);

  const loadFullHistory = () => {
    if (!fullDataLoaded) {
      setIsLoading(true);
      const token = localStorage.getItem("access_token");
      const payload = JSON.parse(atob(token.split('.')[1]));
      const usuario_id = payload.id;

      api.get(`/salida/historial/${usuario_id}`)
        .then(r => {
          setDatos(r.data);
          setFullDataLoaded(true);
          setViewMode("full");
        })
        .catch(() => setDatos([]))
        .finally(() => setIsLoading(false));
    } else {
      setViewMode("full");
    }
  };

  const applyFilters = (data) => {
    let filtered = data;

    if (viewMode === "today" || viewMode === "full") {
      if (filterDate) {
        filtered = filtered.filter(d => d.fecha === filterDate);
      }
      if (filterName) {
        filtered = filtered.filter(d => d.nombre.toLowerCase().includes(filterName.toLowerCase()));
      }
    } else if (viewMode === "person" && selectedPerson) {
      filtered = data.filter(d => d.nombre === selectedPerson);
    }

    setFilteredDatos(filtered);
  };

  const groupByDepartment = (data) => {
    const grouped = data.reduce((acc, d) => {
      const dep = d.departamento || "Sin Departamento";
      if (!acc[dep]) acc[dep] = [];
      acc[dep].push(d);
      return acc;
    }, {});
    return grouped;
  };

  const groupedData = groupByDepartment(filteredDatos);

  const resetFilters = () => {
    setFilterDate(new Date().toISOString().split('T')[0]);
    setFilterName("");
    setViewMode("today");
    setSelectedPerson(null);
  };

  const showPersonHistory = (nombre) => {
    if (!fullDataLoaded) {
      loadFullHistory();
    }
    setViewMode("person");
    setSelectedPerson(nombre);
    setFilterDate("");
    setFilterName("");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-[#1e2c4a] flex items-center gap-3">
            <FaSignOutAlt className="text-[#3b2f5e]" />
            Historial de Salidas
          </h2>
          <p className="text-[#3b2f5e] opacity-80">
            {viewMode === "today" ? "Registros de hoy" : 
             viewMode === "full" ? "Historial completo" : 
             `Historial de ${selectedPerson}`}
          </p>
        </div>
        
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={loadFullHistory}
            className="flex items-center gap-2 bg-gradient-to-r from-[#7fb3ff] to-[#8cc1ff] text-[#1e2c4a] px-4 py-2 rounded-lg font-medium shadow-md"
          >
            <FaHistory /> Historial Completo
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={resetFilters}
            className="flex items-center gap-2 bg-gradient-to-r from-[#91baff] to-[#a0c4ff] text-[#1e2c4a] px-4 py-2 rounded-lg font-medium shadow-md"
          >
            <FaUndo /> Reiniciar
          </motion.button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gradient-to-r from-[#f0f6ff] to-[#e6f0ff] p-5 rounded-xl shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1e2c4a] mb-1 flex items-center gap-2">
              <FaCalendarAlt /> Fecha
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-lg border border-[#a0c4ff] bg-white px-4 py-2 pl-10 shadow-sm focus:border-[#3b2f5e] focus:ring-[#3b2f5e]"
              />
              <FaCalendarAlt className="absolute left-3 top-3 text-[#3b2f5e]" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#1e2c4a] mb-1 flex items-center gap-2">
              <FaSearch /> Buscar Persona
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Nombre del empleado"
                className="w-full rounded-lg border border-[#a0c4ff] bg-white px-4 py-2 pl-10 shadow-sm focus:border-[#3b2f5e] focus:ring-[#3b2f5e]"
              />
              <FaSearch className="absolute left-3 top-3 text-[#3b2f5e]" />
            </div>
          </div>
          
          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyFilters(datos)}
              className="w-full bg-gradient-to-r from-[#3b2f5e] to-[#1e2c4a] text-white px-4 py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2"
            >
              <FaSearch /> Aplicar Filtros
            </motion.button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3b2f5e]"></div>
        </div>
      ) : filteredDatos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <FaUsers className="mx-auto text-4xl text-[#a0c4ff] mb-3" />
          <h3 className="text-xl font-medium text-[#1e2c4a]">No se encontraron registros</h3>
          <p className="text-[#3b2f5e] opacity-80 mt-1">Intenta con otros filtros o fechas</p>
        </div>
      ) : (viewMode === "today" || viewMode === "full") ? (
        Object.entries(groupedData).map(([dep, items]) => (
          <motion.div 
            key={dep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] px-5 py-3 flex items-center gap-3">
              <FaBuilding className="text-white" />
              <h3 className="text-lg font-semibold text-white">{dep}</h3>
              <span className="ml-auto bg-white/20 text-white px-2 py-1 rounded-full text-xs">
                {items.length} {items.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f8faff]">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Foto</th>
                    <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Nombre</th>
                    <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Fecha</th>
                    <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Hora</th>
                    <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6f0ff]">
                  {items.map((d, i) => (
                    <motion.tr 
                      key={i}
                      whileHover={{ backgroundColor: "#f8faff" }}
                      className="transition-colors"
                    >
                      <td className="p-4">
                        {d.foto_path && (
                          <img 
                            src={`http://localhost:8000/${d.foto_path}`}
                            alt={d.nombre}
                            className="w-12 h-12 object-cover rounded-lg border border-[#e6f0ff]"
                          />
                        )}
                      </td>
                      <td className="p-4 font-medium text-[#1e2c4a]">{d.nombre}</td>
                      <td className="p-4 text-[#3b2f5e]">{d.fecha}</td>
                      <td className="p-4 text-[#3b2f5e]">{d.hora}</td>
                      <td className="p-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => showPersonHistory(d.nombre)}
                          className="text-[#3b2f5e] hover:text-[#1e2c4a] font-medium text-sm flex items-center gap-1"
                        >
                          <FaUser className="text-xs" /> Ver historial
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ))
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#1e2c4a] to-[#3b2f5e] px-5 py-3 flex items-center gap-3">
            <FaUser className="text-white" />
            <h3 className="text-lg font-semibold text-white">Historial de Salidas - {selectedPerson}</h3>
            <span className="ml-auto bg-white/20 text-white px-2 py-1 rounded-full text-xs">
              {filteredDatos.length} {filteredDatos.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8faff]">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Foto</th>
                  <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Departamento</th>
                  <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Fecha</th>
                  <th className="p-4 text-left text-sm font-medium text-[#1e2c4a]">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6f0ff]">
                {filteredDatos.map((d, i) => (
                  <motion.tr 
                    key={i}
                    whileHover={{ backgroundColor: "#f8faff" }}
                    className="transition-colors"
                  >
                    <td className="p-4">
                      {d.foto_path && (
                        <img 
                          src={`http://localhost:8000/${d.foto_path}`}
                          alt={d.nombre}
                          className="w-12 h-12 object-cover rounded-lg border border-[#e6f0ff]"
                        />
                      )}
                    </td>
                    <td className="p-4 text-[#3b2f5e]">{d.departamento || "N/A"}</td>
                    <td className="p-4 text-[#3b2f5e]">{d.fecha}</td>
                    <td className="p-4 text-[#3b2f5e]">{d.hora}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}