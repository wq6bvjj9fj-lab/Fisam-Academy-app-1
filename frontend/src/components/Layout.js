import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import NotificationsPanel from "@/components/NotificationsPanel";
import { BookOpen, MessageSquare, Users, LogOut } from "lucide-react";

const LOGO_URL = `${process.env.REACT_APP_BACKEND_URL}/api/uploads/logo_fisam.png`;

export default function Layout() {
  const { user, logout, isInstructor } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/lessons", label: "Lezioni", icon: BookOpen },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    ...(isInstructor ? [{ path: "/students", label: "Allievi", icon: Users }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 bg-[#0A0A0A] border-r border-white/10 flex-col z-40">
        <div className="p-6 flex flex-col items-center border-b border-white/10">
          <div className="w-[72px] h-[72px] rounded-full bg-white p-[3px]" data-testid="sidebar-logo">
            <div className="w-full h-full rounded-full overflow-hidden bg-black">
              <img src={`${LOGO_URL}?v=2`} alt="FISAM" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1
            className="text-white text-lg font-bold tracking-wider uppercase mt-2"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            FISAM ACADEMY
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium tracking-wider uppercase transition-all ${
                isActive(item.path)
                  ? "bg-[#F5A623]/10 text-[#F5A623] border-l-2 border-[#F5A623]"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[#F5A623] text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-white/40 text-xs capitalize">{user?.role === "instructor" ? "Istruttore" : "Allievo"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-white/40 hover:text-red-400 text-sm px-3 py-2 w-full transition-colors"
            data-testid="sidebar-logout"
          >
            <LogOut className="w-4 h-4" />
            Esci
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/10 px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-9 h-9 rounded-full bg-white p-[2px]">
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                <img src={`${LOGO_URL}?v=2`} alt="FISAM" className="w-full h-full object-contain" />
              </div>
            </div>
            <span
              className="text-white font-bold tracking-wider uppercase text-sm"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              FISAM ACADEMY
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-white/40 text-sm">
              Benvenuto, <span className="text-white font-medium">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsPanel />
            <button
              onClick={logout}
              className="md:hidden text-white/40 hover:text-red-400 transition-colors p-2"
              data-testid="header-logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/10 z-50 md:hidden"
        data-testid="mobile-nav"
      >
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[60px] transition-colors ${
                isActive(item.path) ? "text-[#F5A623]" : "text-white/40"
              }`}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] tracking-wider uppercase font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
