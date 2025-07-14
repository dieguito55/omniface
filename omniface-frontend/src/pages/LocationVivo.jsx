import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRecon } from "../context/ReconContext";
import { useGlobalRecon } from "../context/GlobalReconContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Search, MapPin, Users, AlertTriangle } from "lucide-react"; // Asumiendo icons de lucide-react para diseño pro
import api from "../api/api";

export default function LocationVivo() {
  const { numCamaras } = useGlobalRecon();
  const recon0 = useRecon(0);
  const recon1 = numCamaras >= 2 ? useRecon(1) : { data: { summary: {} } };
  const recon2 = numCamaras >= 3 ? useRecon(2) : { data: { summary: {} } };

  const [summary, setSummary] = useState({ personas_por_area: {}, visitantes_por_area: {} });
  const [fromBD, setFromBD] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);

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
    const interval = setInterval(fetchBD, 3000); // Actualizar cada 3s para más real-time
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

  // Update summary state only if it has changed
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

  if (loading) {
    return (
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-500">
        Cargando datos...
      </motion.p>
    );
  }

  // Combine backend and live data
  const bdArea = fromBD.reduce((acc, item) => {
    const ubi = item.ubicacion_actual || item.ubicacion;  // Asumiendo campo
    acc[ubi] = (acc[ubi] || 0) + 1;
    return acc;
  }, {});
  const finalArea = { ...bdArea };
  for (const [key, value] of Object.entries(summary.personas_por_area)) {
    finalArea[key] = (finalArea[key] || 0) + value;
  }

  const heatData = Object.entries(finalArea).map(([area, conteo]) => ({ area, conteo }));

  // Función para color de calor
  const getHeatColor = (conteo) => {
    if (conteo >= 5) return "#ef4444";  // Rojo (Tailwind red-500)
    if (conteo >= 3) return "#f97316";  // Naranja (orange-500)
    if (conteo >= 1) return "#eab308";  // Amarillo (yellow-500)
    return "#22c55e";  // Verde (green-500)
  };

  // Últimas ubicaciones (asumiendo fromBD tiene nombre_completo, ubicacion_actual, updated_at)
  const lastLocations = fromBD
    .sort((a, b) => new Date(b.updated_at || b.timestamp) - new Date(a.updated_at || a.timestamp))  // Ordenar por reciente
    .slice(0, 10);  // Últimas 10

  // Búsqueda de persona
  const handleSearch = (e) => {
    e.preventDefault();
    const person = fromBD
      .filter((item) => (item.nombre_completo || "").toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];  // Última ubicación
    setSelectedPerson(person || { error: "Persona no encontrada" });
  };

  // Generar puntitos para cada persona/visitante en el mapa virtual
  const generateDots = (total) => {
    return Array.from({ length: total }).map((_, i) => (
      <div key={i} className="w-2 h-2 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-white rounded-xl shadow-2xl border border-gray-200"
    >
      <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 flex items-center justify-center gap-2">
        <MapPin className="w-6 h-6 text-blue-600" />
        Localización en Vivo
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-3">
          {/* Mapa de Calor con colores dinámicos */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Mapa de Calor por Densidad
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={heatData}>
                <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "white", border: "1px solid #e5e5e5", borderRadius: "8px" }}
                />
                <Bar dataKey="conteo" radius={[4, 4, 0, 0]}>
                  {heatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getHeatColor(entry.conteo)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mapa Virtual Mejorado con puntitos */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-gray-700 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Mapa Virtual (Personas Totales con Indicadores)
            </h3>
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg grid grid-cols-3 gap-4 p-4 shadow-inner">
              {["camara_0", "camara_1", "camara_2"].slice(0, numCamaras).map((cam, index) => {
                const conteo = finalArea[cam] || 0;
                const visitantes = summary.visitantes_por_area[cam] || 0;
                const total = conteo + visitantes;
                const color = getHeatColor(total);
                return (
                  <div
                    key={cam}
                    className="flex flex-col items-center justify-center bg-white/80 rounded-lg shadow-md p-3 transition-all hover:scale-105"
                    style={{ borderLeft: `4px solid ${color}` }}
                  >
                    <div className="text-sm font-semibold text-gray-800">{cam.replace("_", " ").toUpperCase()}</div>
                    <div className="text-xs text-gray-600">Conocidas: {conteo}</div>
                    <div className="text-xs text-gray-600">Visitantes: {visitantes}</div>
                    <div className="text-sm font-bold text-gray-900">Total: {total}</div>
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {generateDots(total)}  {/* Puntitos animados representando personas */}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabla de conteos */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área/Cámara</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conocidas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitantes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(finalArea).map(([area, conteo]) => {
                  const visitantes = summary.visitantes_por_area[area] || 0;
                  return (
                    <tr key={area}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{area}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{conteo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{visitantes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{conteo + visitantes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Últimas Ubicaciones */}
          <div className="mt-6">
            <h3 className="font-medium mb-3 text-gray-700">Últimas Ubicaciones Registradas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Persona</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lastLocations.map((item, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.nombre_completo || "Desconocido"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.ubicacion_actual}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.updated_at || item.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Buscador de Persona */}
        <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="font-medium mb-3 text-gray-700 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Buscar Persona Conocida
          </h3>
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre de la persona..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
              Buscar Ubicación
            </button>
          </form>
          {selectedPerson && (
            <div className="mt-4 p-3 bg-white rounded-md shadow">
              {selectedPerson.error ? (
                <p className="text-red-600">{selectedPerson.error}</p>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">{selectedPerson.nombre_completo}</p>
                  <p className="text-sm text-gray-600">Ubicación: <span className="font-medium">{selectedPerson.ubicacion_actual}</span></p>
                  <p className="text-sm text-gray-500">Última actualización: {new Date(selectedPerson.updated_at).toLocaleString()}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}