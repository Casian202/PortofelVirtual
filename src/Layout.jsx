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
  Shield,
  ChevronsLeft,
  ChevronsRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Desktop collapsed state - persisted in localStorage
  const [collapsed, setCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const navigate = useNavigate();

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

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

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  const NavLink = ({ item }) => {
    const isActive = currentPageName === item.page;
    const Icon = item.icon;
    const link = (
      <Link
        key={item.page}
        to={createPageUrl(item.page)}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
          collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
        } ${
          isActive
            ? "bg-gradient-to-r from-emerald-500/15 to-blue-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
            : "text-slate-400 hover:text-slate-200 hover:bg-[#222636]"
        }`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.page}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="bg-[#1A1D29] border-[#2A2E3D] text-white text-xs">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  return (
    <TooltipProvider delayDuration={100}>
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
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar - mobile drawer (always expanded) */}
        <aside
          className={`fixed lg:hidden top-0 left-0 h-screen w-64 bg-[#1A1D29]/95 backdrop-blur-xl border-r border-[#2A2E3D] z-50 flex flex-col transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile Logo + Close */}
          <div className="p-4 border-b border-[#2A2E3D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">PortofelVirtual</h1>
                <p className="text-[10px] text-slate-500">Management Financiar</p>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-[#222636] text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/15 to-blue-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#222636]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : ""}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Mobile User section */}
          <div className="p-3 border-t border-[#2A2E3D]">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                  {user.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name || "Utilizator"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => { setMobileOpen(false); handleChangePassword(); }}
              className="w-full justify-start gap-3 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl mb-1 h-10"
            >
              <KeyRound className="w-4 h-4" />
              Schimbă Parola
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-10"
            >
              <LogOut className="w-4 h-4" />
              Deconectare
            </Button>
          </div>
        </aside>

        {/* Sidebar - desktop (collapsible) */}
        <aside
          className={`hidden lg:flex sticky top-0 left-0 h-screen ${sidebarWidth} bg-[#1A1D29]/80 backdrop-blur-xl border-r border-[#2A2E3D] flex-col transition-all duration-300`}
        >
          {/* Desktop Logo */}
          <div className={`border-b border-[#2A2E3D] ${collapsed ? 'p-3 flex justify-center' : 'p-5'}`}>
            {collapsed ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight">PortofelVirtual</h1>
                  <p className="text-xs text-slate-500">Management Financiar</p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-3'} space-y-1 overflow-y-auto`}>
            {navItems.map((item) => (
              <NavLink key={item.page} item={item} />
            ))}
          </nav>

          {/* Desktop User section */}
          <div className={`border-t border-[#2A2E3D] ${collapsed ? 'p-2' : 'p-3'}`}>
            {user && !collapsed && (
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {user.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name || "Utilizator"}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            )}
            {user && collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center py-2 mb-1">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                      {user.full_name?.[0]?.toUpperCase() || "U"}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1A1D29] border-[#2A2E3D] text-white text-xs">
                  {user.full_name || "Utilizator"}
                </TooltipContent>
              </Tooltip>
            )}
            {collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleChangePassword}
                      className="w-full h-10 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl mb-1"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1A1D29] border-[#2A2E3D] text-white text-xs">
                    Schimbă Parola
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLogout}
                      className="w-full h-10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1A1D29] border-[#2A2E3D] text-white text-xs">
                    Deconectare
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
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
              </>
            )}

            {/* Collapse toggle */}
            <button
              onClick={toggleCollapsed}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-[#222636] transition-colors text-xs"
            >
              {collapsed ? <ChevronsRight className="w-4 h-4" /> : <><ChevronsLeft className="w-4 h-4" /> <span>Restrânge</span></>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-screen min-w-0 overflow-x-hidden">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-30 bg-[#0F1117]/80 backdrop-blur-xl border-b border-[#2A2E3D] px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setMobileOpen(true)}
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

          <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}