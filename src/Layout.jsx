import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "./utils";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Settings,
  LogOut,
  Menu,
  KeyRound,
  Wallet,
  PieChart,
  Target,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();

  // Build nav items dynamically based on user role
  const navItems = [
    { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { name: "Venituri", page: "Incomes", icon: TrendingUp },
    { name: "Cheltuieli", page: "Expenses", icon: TrendingDown },
    { name: "Portofel", page: "Wallet", icon: Wallet },
    { name: "Investiții", page: "Investments", icon: PieChart },
    { name: "Obiective", page: "Goals", icon: Target },
    ...(user?.role === 'admin' ? [
      { name: "Administrare", page: "Admin", icon: Shield },
    ] : []),
    { name: "Setări Buget", page: "BudgetSettings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-white flex">
      <style>{`
        :root {
          --bg-primary: #0F1117;
          --bg-card: #1A1D29;
          --bg-card-hover: #222636;
          --accent-green: #10B981;
          --accent-blue: #3B82F6;
          --accent-red: #EF4444;
          --accent-amber: #F59E0B;
          --text-primary: #F1F5F9;
          --text-secondary: #94A3B8;
          --border-color: #2A2E3D;
        }
        body { background: #0F1117; margin: 0; }
        * { scrollbar-width: thin; scrollbar-color: #2A2E3D #0F1117; }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-[#1A1D29]/80 backdrop-blur-xl border-r border-[#2A2E3D] z-50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#2A2E3D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">PortofelVirtual</h1>
              <p className="text-xs text-slate-500">Management Financiar</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-blue-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#222636]"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[#2A2E3D]">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                {user.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.full_name || "Utilizator"}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={handleChangePassword}
            className="w-full justify-start gap-3 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl mb-1"
          >
            <KeyRound className="w-4 h-4" />
            Schimbă Parola
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
          >
            <LogOut className="w-4 h-4" />
            Deconectare
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-[#0F1117]/80 backdrop-blur-xl border-b border-[#2A2E3D] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-[#1A1D29] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">PortofelVirtual</span>
          </div>
          <div className="w-9" />
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}