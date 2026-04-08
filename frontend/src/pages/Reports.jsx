import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, CheckCircle, Clock, XCircle } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

const STATUS_STYLES = {
  pending: { icon: Clock, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  verified: { icon: CheckCircle, bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  closed: { icon: XCircle, bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export default function Reports() {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", disaster_number: "", severity: "medium" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      const { data } = await client.get("/reports");
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        disaster_number: form.disaster_number ? parseInt(form.disaster_number) : null,
      };
      await client.post("/reports", payload);
      setShowForm(false);
      setForm({ title: "", description: "", disaster_number: "", severity: "medium" });
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit report");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (reportId, status) => {
    try {
      await client.put(`/reports/${reportId}/status`, { status });
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm("Delete this report?")) return;
    try {
      await client.delete(`/reports/${reportId}`);
      fetchReports();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incident Reports</h1>
          <p className="text-gray-500 mt-1">User-submitted disaster incident reports</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {/* New Report Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Submit New Report</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disaster #</label>
                  <input
                    type="number"
                    value={form.disaster_number}
                    onChange={(e) => setForm((f) => ({ ...f, disaster_number: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No reports yet</p>
          </div>
        ) : (
          reports.map((r) => {
            const style = STATUS_STYLES[r.status] || STATUS_STYLES.pending;
            const StatusIcon = style.icon;
            return (
              <div key={r.report_id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{r.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border}`}>
                        <StatusIcon className="w-3 h-3" />
                        {r.status}
                      </span>
                      {r.severity && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {r.severity}
                        </span>
                      )}
                    </div>
                    {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>By {r.username}</span>
                      {r.disaster_number && <span>Disaster #{r.disaster_number}</span>}
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isAdmin && r.status !== "verified" && (
                      <button
                        onClick={() => handleStatusChange(r.report_id, "verified")}
                        className="text-green-600 hover:bg-green-50 p-1.5 rounded"
                        title="Verify"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && r.status !== "closed" && (
                      <button
                        onClick={() => handleStatusChange(r.report_id, "closed")}
                        className="text-gray-400 hover:bg-gray-50 p-1.5 rounded"
                        title="Close"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r.report_id)}
                      className="text-red-400 hover:bg-red-50 p-1.5 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
