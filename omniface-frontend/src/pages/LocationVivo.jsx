import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRecon } from "../context/ReconContext";
import { useGlobalRecon } from "../context/GlobalReconContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Search, MapPin, Users, AlertTriangle, User, Clock, Eye, Thermometer, ChevronRight, ChevronDown } from "lucide-react";
import api from "../api/api";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function LocationVivo() {
  const { numCamaras } = useGlobalRecon();
  const recon0 = useRecon(0);
  const recon1 = numCamaras >= 2 ? useRecon(1) : { data: { faces: [], summary: {} } };
  const recon2 = numCamaras >= 3 ? useRecon(2) : { data: { faces: [], summary: {} } };

  const [summary, setSummary] = useState({ personas_por_area: {}, visitantes_por_area: {} });
  const [fromBD, setFromBD] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [expandedSection, setExpandedSection] = useState({
    heatmap: true,
    virtualMap: true,
    detailedCounts: true,
    lastLocations: true
  });

  // Fetch data from backend
  useEffect(() => {
    let isMounted = true;

    const fetchBD = async () => {
      try {
        const token = localStorage.getItem("access_token")?.replace(/^Bearer\s+/i, "") || "";
        const res = await api.get(`/recon/estados?token=${token}`);
        if (isMounted) {
          setFromBD(res.data || []);
          setLoading(false);
        }
      } catch (e) {
        console.error("Error fetching estados:", e);
        if (isMounted) setLoading(false);
      }
    };

    fetchBD();
    const interval = setInterval(fetchBD, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Merge summaries with memoization
  const mergedSummary = useMemo(() => {
    const newSummary = {
      personas_por_area: {},
      visitantes_por_area: {}
    };
    const summaries = [recon0.data.summary, recon1.data.summary, recon2.data.summary].filter(s => s);

    for (const s of summaries) {
      if (s.personas_por_area) {
        for (const [key, value] of Object.entries(s.personas_por_area)) {
          newSummary.personas_por_area[key] = (newSummary.personas_por_area[key] || 0) + value;
        }
      }
      if (s.visitantes_por_area) {
        for (const [key, value] of Object.entries(s.visitantes_por_area)) {
          newSummary.visitantes_por_area[key] = (newSummary.visitantes_por_area[key] || 0) + value;
        }
      }
    }
    return newSummary;
  }, [recon0.data.summary, recon1.data.summary, recon2.data.summary, numCamaras]);

  // Update summary state
  useEffect(() => {
    setSummary((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(mergedSummary)) {
        return mergedSummary;
      }
      return prev;
    });
    if (Object.keys(mergedSummary.personas_por_area).length > 0) {
      setLoading(false);
    }
  }, [mergedSummary]);

  // Conteo total live por cámara
  const liveTotalByCam = useMemo(() => {
    return {
      camara_0: recon0.data.faces.length,
      camara_1: recon1.data.faces.length,
      camara_2: recon2.data.faces.length,
    };
  }, [recon0.data.faces, recon1.data.faces, recon2.data.faces, numCamaras]);

  // Combine backend and live data
  const bdArea = fromBD.reduce((acc, item) => {
    const ubi = item.ubicacion_actual || "Sin Ubicación";
    acc[ubi] = (acc[ubi] || 0) + 1;
    return acc;
  }, {});

  const finalArea = {};
  const allAreas = new Set([...Object.keys(liveTotalByCam), ...Object.keys(bdArea)]);
  allAreas.forEach(area => {
    const liveTotal = liveTotalByCam[area] || 0;
    const conocidosBD = bdArea[area] || 0;
    finalArea[area] = liveTotal + (conocidosBD - (summary.personas_por_area[area] || 0));
  });

  // Datos para gráficos
  const heatData = Object.entries(finalArea).map(([area, conteo]) => ({ area, conteo }));
  const pieData = [
    { name: 'Conocidos', value: Object.values(summary.personas_por_area).reduce((a, b) => a + b, 0) },
    { name: 'Visitantes', value: Object.values(summary.visitantes_por_area).reduce((a, b) => a + b, 0) }
  ];

  // Función para color de calor mejorada
  const getHeatColor = (conteo) => {
    if (conteo >= 5) return "#ef4444";  // Rojo
    if (conteo >= 3) return "#f97316";  // Naranja
    if (conteo >= 1) return "#eab308";  // Amarillo
    return "#22c55e";  // Verde
  };

  // Filtrar personas según búsqueda
  const filteredPersons = useMemo(() => {
    if (!searchQuery) return fromBD.slice(0, 5);
    return fromBD
      .filter((item) => item.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.timestamp_ultimo) - new Date(a.timestamp_ultimo));
  }, [fromBD, searchQuery]);

  // Generar puntitos animados
  const generateDots = (total) => {
    return Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: i * 0.1 }}
        className="w-2 h-2 bg-white rounded-full opacity-70"
        style={{ backgroundColor: getHeatColor(total) }}
      />
    ));
  };

  // Toggle sections
  const toggleSection = (section) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3b2f5e]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-white rounded-xl shadow-2xl border border-gray-100"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1e2c4a] flex items-center gap-3">
            <MapPin className="w-6 h-6 text-[#3b2f5e]" />
            Dashboard de Localización en Vivo
          </h2>
          <p className="text-[#3b2f5e] opacity-80">Monitoreo en tiempo real de personas y visitantes</p>
        </div>
        <div className="flex items-center gap-2 bg-[#f0f6ff] px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-[#1e2c4a]">En vivo</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-[#e6f0ff] to-[#d6e4ff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#3b2f5e] opacity-80">Personas Totales</p>
                  <p className="text-2xl font-bold text-[#1e2c4a]">
                    {Object.values(finalArea).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Users className="w-5 h-5 text-[#3b2f5e]" />
                </div>
              </div>
            </div>
            
            
          </div>

          {/* Mapa de Calor */}
          <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('heatmap')}
            >
              <h3 className="font-medium text-[#1e2c4a] flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-orange-500" />
                Mapa de Calor por Densidad
              </h3>
              {expandedSection.heatmap ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            
            <AnimatePresence>
              {expandedSection.heatmap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={heatData}>
                      <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "white", 
                          border: "1px solid #e5e5e5", 
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                        }}
                        formatter={(value) => [`Total: ${value}`, 'Personas']}
                      />
                      <Bar dataKey="conteo" radius={[4, 4, 0, 0]}>
                        {heatData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getHeatColor(entry.conteo)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mapa Virtual */}
          <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('virtualMap')}
            >
              <h3 className="font-medium text-[#1e2c4a] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                Mapa Virtual con Indicadores
              </h3>
              {expandedSection.virtualMap ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            
            <AnimatePresence>
              {expandedSection.virtualMap && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg grid grid-cols-3 gap-4 p-4 shadow-inner border border-[#e6f0ff]">
                    {["camara_0", "camara_1", "camara_2"].slice(0, numCamaras).map((cam, index) => {
                      const total = finalArea[cam] || 0;
                      const color = getHeatColor(total);
                      return (
                        <motion.div
                          key={cam}
                          whileHover={{ scale: 1.05 }}
                          className="flex flex-col items-center justify-center bg-white rounded-xl shadow-md p-3 transition-all"
                          style={{ borderLeft: `4px solid ${color}` }}
                        >
                          <div className="text-sm font-semibold text-[#1e2c4a]">{cam.replace("_", " ").toUpperCase()}</div>
                          <div className="text-lg font-bold text-[#3b2f5e]">{total}</div>
                          <div className="flex flex-wrap gap-1 mt-2 justify-center">
                            {generateDots(total)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Conteos Detallados */}
          <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('detailedCounts')}
            >
              <h3 className="font-medium text-[#1e2c4a] flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Conteos Detallados por Área
              </h3>
              {expandedSection.detailedCounts ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            
            <AnimatePresence>
              {expandedSection.detailedCounts && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#e6f0ff]">
                      <thead className="bg-[#f0f6ff]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#1e2c4a] uppercase tracking-wider">Área/Cámara</th>

                          <th className="px-6 py-3 text-left text-xs font-medium text-[#1e2c4a] uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#e6f0ff]">
                        {Object.entries(finalArea).map(([area, total]) => {
                          const conocidosLive = summary.personas_por_area[area] || 0;
                          const visitantesLive = summary.visitantes_por_area[area] || 0;
                          const conocidosBD = bdArea[area] || 0;
                          return (
                            <motion.tr 
                              key={area}
                              whileHover={{ backgroundColor: "#f8faff" }}
                              className="transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1e2c4a]">{area}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3b2f5e]">{conocidosLive + conocidosBD}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3b2f5e]">{visitantesLive}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#1e2c4a]">{total}</td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Últimas Ubicaciones */}
          <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('lastLocations')}
            >
              <h3 className="font-medium text-[#1e2c4a] flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Últimas Ubicaciones Registradas
              </h3>
              {expandedSection.lastLocations ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            
            <AnimatePresence>
              {expandedSection.lastLocations && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#e6f0ff]">
                      <thead className="bg-[#f0f6ff]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#1e2c4a] uppercase tracking-wider">Persona</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#1e2c4a] uppercase tracking-wider">Ubicación</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#1e2c4a] uppercase tracking-wider">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#e6f0ff]">
                        {fromBD
                          .sort((a, b) => new Date(b.timestamp_ultimo) - new Date(a.timestamp_ultimo))
                          .slice(0, 5)
                          .map((item, i) => (
                            <motion.tr 
                              key={i}
                              whileHover={{ backgroundColor: "#f8faff" }}
                              className="transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1e2c4a]">{item.nombre || "Desconocido"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3b2f5e]">{item.ubicacion_actual}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#3b2f5e] opacity-80">
                                {new Date(item.timestamp_ultimo).toLocaleString()}
                              </td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Distribución de Personas */}
          <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
            <h3 className="font-medium text-[#1e2c4a] mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3b2f5e]" />
              Distribución de Personas
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} personas`, 'Total']}
                  contentStyle={{ 
                    backgroundColor: "white", 
                    border: "1px solid #e5e5e5", 
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Buscador de Personas */}
          <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
            <h3 className="font-medium text-[#1e2c4a] mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-[#3b2f5e]" />
              Buscar Persona
            </h3>
            <div className="relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre de la persona..."
                className="w-full px-3 py-2 border border-[#e6f0ff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b2f5e] focus:border-transparent"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-[#3b2f5e] opacity-70" />
            </div>
            
            <div className="space-y-3">
              {filteredPersons.slice(0, 5).map((person) => (
                <motion.div
                  key={person.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPerson(person)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPerson?.id === person.id ? 'bg-[#3b2f5e] text-white' : 'bg-white text-[#1e2c4a] hover:bg-[#f0f6ff]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{person.nombre}</p>
                      <p className="text-sm opacity-80">{person.ubicacion_actual}</p>
                    </div>
                    <div className="text-xs opacity-70">
                      {new Date(person.timestamp_ultimo).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detalle de Persona Seleccionada */}
          {selectedPerson && (
            <div className="bg-[#f8faff] p-4 rounded-xl shadow-sm border border-[#e6f0ff]">
              <h3 className="font-medium text-[#1e2c4a] mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-[#3b2f5e]" />
                Detalle de Persona
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {selectedPerson.foto_path && (
                    <img 
                      src={`http://localhost:8000/${selectedPerson.foto_path}`}
                      alt={selectedPerson.nombre}
                      className="w-12 h-12 object-cover rounded-lg border border-[#e6f0ff]"
                    />
                  )}
                  <div>
                    <p className="font-bold text-[#1e2c4a]">{selectedPerson.nombre}</p>
                    <p className="text-sm text-[#3b2f5e]">{selectedPerson.departamento || "Sin departamento"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded-lg">
                    <p className="text-xs text-[#3b2f5e] opacity-70">Ubicación</p>
                    <p className="font-medium">{selectedPerson.ubicacion_actual}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <p className="text-xs text-[#3b2f5e] opacity-70">Estado</p>
                    <p className="font-medium">{selectedPerson.estado || "Desconocido"}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <p className="text-xs text-[#3b2f5e] opacity-70">Emoción</p>
                    <p className="font-medium">{selectedPerson.emocion_actual || "Neutral"}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <p className="text-xs text-[#3b2f5e] opacity-70">Última vez</p>
                    <p className="font-medium">{new Date(selectedPerson.timestamp_ultimo).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}