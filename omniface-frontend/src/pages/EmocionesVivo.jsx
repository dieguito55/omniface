import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useRecon } from "../context/ReconContext";
import { useGlobalRecon } from "../context/GlobalReconContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FaSmile, FaUsers, FaArrowTrendUp } from "react-icons/fa6";
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

  useEffect(() => {
    let isMounted = true;

    const fetchBD = async () => {
      try {
        const token =
          localStorage.getItem("access_token")?.replace(/^Bearer\s+/i, "") ||
          "";
        const res = await api.get(`/recon/estados?token=${token}`);
        if (isMounted) {
          const data = res.data || [];
          setFromBD(data);
          setLoading(false);
        }
      } catch (e) {
        console.error("Error fetching estados:", e);
        if (isMounted) setLoading(false);
      }
    };

    fetchBD();
    const interval = setInterval(fetchBD, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const mergedSummary = useMemo(() => {
    const summaries = [
      recon0.data.summary,
      recon1.data.summary,
      recon2.data.summary,
    ].filter((s) => s && Object.keys(s).length > 0);

    const newSummary = {
      emociones_conteo: {},
      dominante_por_camara:
        summaries[summaries.length - 1]?.dominante_por_camara || "",
      tendencia: summaries[summaries.length - 1]?.tendencia || "",
      personalizados: {},
      visitantes: {},
    };

    summaries.forEach((s) => {
      Object.entries(s.emociones_conteo || {}).forEach(([key, val]) => {
        newSummary.emociones_conteo[key] =
          (newSummary.emociones_conteo[key] || 0) + val;
      });
      Object.assign(newSummary.personalizados, s.personalizados || {});
      Object.entries(s.visitantes || {}).forEach(([key, val]) => {
        newSummary.visitantes[key] =
          (newSummary.visitantes[key] || 0) + val;
      });
    });

    return newSummary;
  }, [
    recon0.data.summary,
    recon1.data.summary,
    recon2.data.summary,
    numCamaras,
  ]);

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
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-gray-500"
      >
        Cargando datos...
      </motion.p>
    );
  }

  const bdConteo = fromBD.reduce((acc, item) => {
    const emocion = item.emocion || "N/A";
    if (emocion !== "N/A") {
      acc[emocion] = (acc[emocion] || 0) + 1;
    }
    return acc;
  }, {});
  const finalConteo = { ...bdConteo };
  Object.entries(summary.emociones_conteo || {}).forEach(([key, val]) => {
    finalConteo[key] = (finalConteo[key] || 0) + val;
  });

  if (Object.keys(finalConteo).length === 0) {
    return (
      <p className="text-center text-gray-500">No hay datos disponibles</p>
    );
  }

  const chartData = Object.entries(finalConteo).map(([emocion, conteo]) => ({
    emocion,
    conteo,
  }));

  const totalEmociones = Object.values(finalConteo).reduce(
    (sum, val) => sum + val,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 rounded-xl"
      style={{ backgroundColor: "#1e2c4a", color: "#ffffff" }}
    >
      <h2 className="text-4xl font-bold mb-8 text-center text-[#a0c4ff]">
        Dashboard Emociones Vivo
      </h2>

      {/* SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#3b2f5e] p-6 rounded-lg shadow-md flex items-center">
          <FaSmile className="text-[#91baff] text-4xl mr-4" />
          <div>
            <p className="text-sm uppercase text-[#a0c4ff]">Total Emociones</p>
            <p className="text-3xl font-bold">{totalEmociones}</p>
          </div>
        </div>
        <div className="bg-[#3b2f5e] p-6 rounded-lg shadow-md flex items-center">
          <FaUsers className="text-[#91baff] text-4xl mr-4" />
          <div>
            <p className="text-sm uppercase text-[#a0c4ff]">
              Emoción Dominante
            </p>
            <p className="text-2xl font-bold">
              {summary.dominante_por_camara || "N/A"}
            </p>
          </div>
        </div>
        <div className="bg-[#3b2f5e] p-6 rounded-lg shadow-md flex items-center">
          <FaArrowTrendUp className="text-[#91baff] text-4xl mr-4" />
          <div>
            <p className="text-sm uppercase text-[#a0c4ff]">Tendencia</p>
            <p className="text-2xl font-bold">
              {summary.tendencia || "No disponible"}
            </p>
          </div>
        </div>
      </div>

      {/* BARCHART */}
      <div className="bg-[#ffffff] rounded-lg p-6 shadow-md">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="emocion" stroke="#1e2c4a" />
            <YAxis stroke="#1e2c4a" />
            <Tooltip />
            <Legend />
            <Bar dataKey="conteo" fill="#3b2f5e" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TABLAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        <div className="bg-[#3b2f5e] p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4 text-[#a0c4ff]">
            Conocidos
          </h3>
          <table className="w-full text-left">
            <tbody>
              {Object.entries(summary.personalizados || {}).map(
                ([name, info]) => (
                  <tr key={name} className="border-b border-[#a0c4ff]/20">
                    <td className="py-2">{name}</td>
                    <td className="py-2">{info}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-[#3b2f5e] p-6 rounded-lg">
          <h3 className="text-lg font-bold mb-4 text-[#a0c4ff]">
            Visitantes
          </h3>
          <table className="w-full text-left">
            <tbody>
              {Object.entries(summary.visitantes || {}).map(
                ([emoc, count]) => (
                  <tr key={emoc} className="border-b border-[#a0c4ff]/20">
                    <td className="py-2">{emoc}</td>
                    <td className="py-2">{count}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
