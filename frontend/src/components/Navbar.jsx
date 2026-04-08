//Author - Aditya
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  List,
  PlusCircle,
  FileText,
  LogIn,
  LogOut,
  UserPlus,
  Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/disasters", label: "Disasters", icon: List },
];

export default function Navbar() {
  const { user, logout, isEditor } = useAuth();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path
      ? "bg-indigo-700 text-white"
      : "text-indigo-100 hover:bg-indigo-600 hover:text-white";

  return (
    <nav className="bg-indigo-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <Globe className="w-6 h-6" />
            <span className="hidden sm:inline">Disaster Tracker</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(to)}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}

            {isEditor && (
              <Link
                to="/disasters/new"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/disasters/new")}`}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden md:inline">New</span>
              </Link>
            )}

            {user && (
              <Link
                to="/reports"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/reports")}`}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">Reports</span>
              </Link>
            )}

            <div className="ml-2 pl-2 border-l border-indigo-600 flex items-center gap-1">
              {user ? (
                <>
                  <span className="text-indigo-200 text-sm hidden lg:inline">
                    {user.username}
                    <span className="ml-1 text-xs bg-indigo-600 px-1.5 py-0.5 rounded">
                      {user.role}
                    </span>
                  </span>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium text-indigo-100 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden md:inline">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/login")}`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden md:inline">Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive("/register")}`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden md:inline">Register</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
