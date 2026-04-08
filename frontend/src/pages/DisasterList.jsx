import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import client from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

export default function DisasterList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [disasters, setDisasters] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [states, setStates] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    incident_type: searchParams.get("incident_type") || "",
    state: searchParams.get("state") || "",
    declaration_type: searchParams.get("declaration_type") || "",
    start_date: searchParams.get("start_date") || "",
    end_date: searchParams.get("end_date") || "",
  });

  useEffect(() => {
    Promise.all([
      client.get("/lookup/incident-types"),
      client.get("/lookup/states"),
    ]).then(([typeRes, stateRes]) => {
      setIncidentTypes(typeRes.data);
      setStates(stateRes.data);
    });
  }, []);

  const fetchDisasters = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await client.get("/disasters", { params });
      setDisasters(data.data);
      setPagination(data.pagination);

      const sp = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) sp.set(k, v); });
      if (page > 1) sp.set("page", page);
      setSearchParams(sp, { replace: true });
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, setSearchParams]);

  useEffect(() => { fetchDisasters(); }, [fetchDisasters]);

  const handleExport = async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const { data } = await client.get("/export/csv", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "disasters_export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const clearFilters = () => {
    setFilters({ search: "", incident_type: "", state: "", declaration_type: "", start_date: "", end_date: "" });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Disaster Records</h1>
          <p className="text-gray-500 mt-1">{pagination.total.toLocaleString()} records found</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search disaster titles..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && fetchDisasters()}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
              showFilters ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100">
            <select
              value={filters.incident_type}
              onChange={(e) => setFilters((f) => ({ ...f, incident_type: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Incident Types</option>
              {incidentTypes.map((t) => (
                <option key={t.incident_type_id} value={t.incident_type_name}>{t.incident_type_name}</option>
              ))}
            </select>

            <select
              value={filters.state}
              onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s.state_code} value={s.state_abbrev}>{s.state_name}</option>
              ))}
            </select>

            <select
              value={filters.declaration_type}
              onChange={(e) => setFilters((f) => ({ ...f, declaration_type: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Declaration Types</option>
              <option value="DR">Major Disaster</option>
              <option value="EM">Emergency</option>
              <option value="FM">Fire Management</option>
            </select>

            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Start date"
            />
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="End date"
            />
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Declaration</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Programs</th>
                </tr>
              </thead>
              <tbody>
                {disasters.map((d) => (
                  <tr key={d.disaster_number} className="border-t border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/disasters/${d.disaster_number}`} className="text-indigo-600 font-medium hover:underline">
                        {d.disaster_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <Link to={`/disasters/${d.disaster_number}`} className="text-gray-900 hover:text-indigo-600">
                        {d.declaration_title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                        {d.incident_type_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{d.declaration_type_name}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {new Date(d.declaration_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {d.ih_program && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">IH</span>}
                        {d.ia_program && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">IA</span>}
                        {d.pa_program && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs">PA</span>}
                        {d.hm_program && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">HM</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {disasters.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No disasters found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDisasters(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => fetchDisasters(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
