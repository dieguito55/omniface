import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRecon } from "../context/ReconContext";
import { useGlobalRecon } from "../context/GlobalReconContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/api";

export default function EmocionesVivo() {
  const { numCamaras } = useGlobalRecon();
  const recon0 = useRecon(0);
  const recon1 = numCamaras >= 2 ? useRecon(1) : { data: { summary: {} } };
  const recon2 = numCamaras >= 3 ? useRecon(2) : { data: { summary: {} } };

  const [summary, setSummary] = useState({
    emociones_conteo: {},
    dominante_por_camara: "",
    tendencia: "",
    personalizados: {},
    visitantes: {},
  });
  const [fromBD, setFromBD] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchBD, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Merge summaries with memoization
  const mergedSummary = useMemo(() => {
    const newSummary = { ...recon0.data.summary };
    if (numCamaras >= 2) {
      Object.assign(newSummary, recon1.data.summary);
    }
    if (numCamaras >= 3) {
      Object.assign(newSummary, recon2.data.summary);
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
    if (Object.keys(mergedSummary.emociones_conteo || {}).length > 0) {
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
  const bdConteo = fromBD.reduce((acc, item) => {
    const emocion = item.emocion || "N/A";
    acc[emocion] = (acc[emocion] || 0) + 1;
    return acc;
  }, {});
  const finalConteo = { ...bdConteo, ...summary.emociones_conteo };

  if (Object.keys(finalConteo).length === 0) {
    return <p className="text-center text-gray-500">No hay datos disponibles</p>;
  }

  const chartData = Object.entries(finalConteo).map(([emocion, conteo]) => ({ emocion, conteo }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-700">Emociones en Vivo</h2>
      <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="emocion" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="conteo" fill="#4CAF50" animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
      <p className="mt-4 text-lg">Emoción dominante por cámara: {summary.dominante_por_camara || "No hay datos"}</p>
      <p className="mt-2 text-lg">Tendencia reciente: {summary.tendencia || "No hay tendencia"}</p>
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <h3 className="font-bold mb-2">Conocidos</h3>
          <table className="w-full">
            <tbody>
              {Object.entries(summary.personalizados || {}).map(([name, info]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{info}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-bold mb-2">Visitantes</h3>
          <table className="w-full">
            <tbody>
              {Object.entries(summary.visitantes || {}).map(([emoc, count]) => (
                <tr key={emoc}>
                  <td>{emoc}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}