import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";
import client from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

export default function DisasterForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    disaster_number: "",
    declaration_type: "DR",
    incident_type_name: "",
    declaration_title: "",
    declaration_date: "",
    incident_begin_date: "",
    incident_end_date: "",
    closeout_date: "",
    ih_program: false,
    ia_program: false,
    pa_program: false,
    hm_program: false,
  });
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const { data: types } = await client.get("/lookup/incident-types");
        setIncidentTypes(types);

        if (isEdit) {
          const { data } = await client.get(`/disasters/${id}`);
          setForm({
            disaster_number: data.disaster_number,
            declaration_type: data.declaration_type?.trim(),
            incident_type_name: data.incident_type_name,
            declaration_title: data.declaration_title,
            declaration_date: data.declaration_date?.slice(0, 10) || "",
            incident_begin_date: data.incident_begin_date?.slice(0, 10) || "",
            incident_end_date: data.incident_end_date?.slice(0, 10) || "",
            closeout_date: data.closeout_date?.slice(0, 10) || "",
            ih_program: data.ih_program || false,
            ia_program: data.ia_program || false,
            pa_program: data.pa_program || false,
            hm_program: data.hm_program || false,
          });
        }
      } catch (err) {
        setError("Failed to load form data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (isEdit) {
        await client.put(`/disasters/${id}`, form);
      } else {
        await client.post("/disasters", {
          ...form,
          disaster_number: parseInt(form.disaster_number),
        });
      }
      window.location.href = `/disasters/${form.disaster_number}`;
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEdit ? "Edit Disaster Record" : "Create New Disaster Record"}
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disaster Number *</label>
              <input
                type="number"
                required
                disabled={isEdit}
                value={form.disaster_number}
                onChange={onChange("disaster_number")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declaration Type *</label>
              <select
                required
                value={form.declaration_type}
                onChange={onChange("declaration_type")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="DR">Major Disaster (DR)</option>
                <option value="EM">Emergency (EM)</option>
                <option value="FM">Fire Management (FM)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type *</label>
              <select
                required
                value={form.incident_type_name}
                onChange={onChange("incident_type_name")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select type...</option>
                {incidentTypes.map((t) => (
                  <option key={t.incident_type_id} value={t.incident_type_name}>
                    {t.incident_type_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Declaration Date *</label>
              <input
                type="date"
                required
                value={form.declaration_date}
                onChange={onChange("declaration_date")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Declaration Title *</label>
            <input
              type="text"
              required
              value={form.declaration_title}
              onChange={onChange("declaration_title")}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., HURRICANE KATRINA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident Begin Date</label>
              <input
                type="date"
                value={form.incident_begin_date}
                onChange={onChange("incident_begin_date")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Incident End Date</label>
              <input
                type="date"
                value={form.incident_end_date}
                onChange={onChange("incident_end_date")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closeout Date</label>
              <input
                type="date"
                value={form.closeout_date}
                onChange={onChange("closeout_date")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Federal Assistance Programs</label>
            <div className="flex flex-wrap gap-4">
              {[
                { key: "ih_program", label: "Individual & Households" },
                { key: "ia_program", label: "Individual Assistance" },
                { key: "pa_program", label: "Public Assistance" },
                { key: "hm_program", label: "Hazard Mitigation" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={onChange(key)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : isEdit ? "Update Record" : "Create Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
