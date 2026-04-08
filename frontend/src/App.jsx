//Author - tanmay
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import DisasterList from "./pages/DisasterList";
import DisasterDetail from "./pages/DisasterDetail";
import DisasterForm from "./pages/DisasterForm";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import LoadingSpinner from "./components/LoadingSpinner";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/disasters" element={<DisasterList />} />
          <Route path="/disasters/:id" element={<DisasterDetail />} />
          <Route
            path="/disasters/new"
            element={
              <ProtectedRoute roles={["editor", "admin"]}>
                <DisasterForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/disasters/:id/edit"
            element={
              <ProtectedRoute roles={["editor", "admin"]}>
                <DisasterForm />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
