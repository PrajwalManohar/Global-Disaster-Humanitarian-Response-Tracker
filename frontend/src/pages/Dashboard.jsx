//Authors for this directory - Aditya, Tanmay
import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertTriangle, TrendingUp, MapPin, Calendar, Shield } from "lucide-react";
import client from "../api/client";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import USMap from "../components/USMap";

const COLORS = [
  "#4f46e5", "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [byType, setByType] = useState([]);
  const [byYear, setByYear] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [byState, setByState] = useState([]);
  const [programs, setPrograms] = useState(null);
  const [topStates, setTopStates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [sumRes, typeRes, yearRes, monthRes, stateRes, progRes, topRes] = await Promise.all([
          client.get("/analytics/summary"),
          client.get("/analytics/by-type"),
          client.get("/analytics/by-year"),
          client.get("/analytics/by-month"),
          client.get("/analytics/by-state"),
          client.get("/analytics/programs"),
          client.get("/analytics/top-states?limit=10"),
        ]);
        setSummary(sumRes.data);
        setByType(typeRes.data.slice(0, 10).map((d) => ({ ...d, total: Number(d.total) })));
        setByYear(yearRes.data.map((d) => ({ ...d, total: Number(d.total) })));
        setByMonth(monthRes.data.map((d) => ({ ...d, total: Number(d.total), name: MONTHS[d.month - 1] })));
        setByState(stateRes.data);
        setPrograms(progRes.data);
        setTopStates(topRes.data);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  const programData = programs
    ? [
        { name: "Individual & Households", value: Number(programs.ih_total) },
        { name: "Individual Assistance", value: Number(programs.ia_total) },
        { name: "Public Assistance", value: Number(programs.pa_total) },
        { name: "Hazard Mitigation", value: Number(programs.hm_total) },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview of U.S. disaster declarations from{" "}
          {summary?.earliest_date?.slice(0, 4) || "1953"} to present
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Total Disasters"
          value={Number(summary?.total_disasters || 0).toLocaleString()}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Incident Types"
          value={summary?.total_types}
          color="amber"
        />
        <StatCard
          icon={MapPin}
          label="States/Territories"
          value={summary?.states_affected}
          color="green"
        />
        <StatCard
          icon={Calendar}
          label="Data Range"
          value={`${summary?.earliest_date?.slice(0, 4) || "?"} – ${summary?.latest_date?.slice(0, 4) || "?"}`}
          color="blue"
        />
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Disaster Frequency by State
        </h2>
        <div className="h-[400px]">
          <USMap data={byState} />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Disasters Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={byYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
                name="Declarations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Type Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Top 10 Disaster Types
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byType}
                dataKey="total"
                nameKey="incident_type_name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ incident_type_name, percent }) =>
                  `${incident_type_name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Seasonal Pattern
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#f59e0b" name="Declarations" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Programs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Federal Assistance Programs
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={programData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Disasters" radius={[0, 4, 4, 0]}>
                {programData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top States Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Top 10 States by Disaster Count
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">State</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Abbreviation</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">Disaster Count</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Most Common Type</th>
              </tr>
            </thead>
            <tbody>
              {topStates.map((s, i) => (
                <tr key={s.state_abbrev} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{s.state_name}</td>
                  <td className="py-3 px-4 text-gray-600">{s.state_abbrev}</td>
                  <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                    {Number(s.disaster_count).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                      {s.most_common_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
