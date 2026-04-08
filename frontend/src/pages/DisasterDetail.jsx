import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Edit, Trash2, Calendar, MapPin, Shield,
  AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function DisasterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEditor, isAdmin } = useAuth();
  const [disaster, setDisaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    client
      .get(`/disasters/${id}`)
      .then(({ data }) => setDisaster(data))
      .catch(() => navigate("/disasters"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await client.delete(`/disasters/${id}`);
      window.location.href = "/disasters";
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!disaster) return <div className="text-center py-20 text-gray-400">Disaster not found</div>;

  const BoolBadge = ({ value, label }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
    }`}>
      {value ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/disasters" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to list
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                  #{disaster.disaster_number}
                </span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                  {disaster.declaration_type_name}
                </span>
              </div>
              <h1 className="text-2xl font-bold">{disaster.declaration_title}</h1>
              <p className="mt-1 text-indigo-200 text-sm flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {disaster.incident_type_name} ({disaster.incident_category})
              </p>
            </div>
            <div className="flex gap-2">
              {isEditor && (
                <Link
                  to={`/disasters/${id}/edit`}
                  className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Edit className="w-4 h-4" /> Edit
                </Link>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1 bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dates */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Timeline</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Declaration Date", value: disaster.declaration_date },
                { label: "Incident Begin", value: disaster.incident_begin_date },
                { label: "Incident End", value: disaster.incident_end_date },
                { label: "Closeout Date", value: disaster.closeout_date },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {value ? new Date(value).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Programs */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Shield className="w-4 h-4" /> Federal Assistance Programs
            </h3>
            <div className="flex flex-wrap gap-2">
              <BoolBadge value={disaster.ih_program} label="Individual & Households" />
              <BoolBadge value={disaster.ia_program} label="Individual Assistance" />
              <BoolBadge value={disaster.pa_program} label="Public Assistance" />
              <BoolBadge value={disaster.hm_program} label="Hazard Mitigation" />
            </div>
          </div>

          {/* Affected Areas */}
          {disaster.areas?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Affected Areas ({disaster.areas.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                {disaster.areas.map((a) => (
                  <div key={a.area_id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-indigo-600">{a.state_abbrev}</span>
                    <span className="text-gray-600">{a.designated_area || "Statewide"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 text-sm mb-5">
              Are you sure you want to delete disaster #{disaster.disaster_number}? This action uses soft-delete and can be reversed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
