import { apiFetch } from '../mockApi';
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Menu, X, LayoutDashboard, FileEdit, Users, LogOut, Settings, Sun, Moon, ShieldAlert, ClipboardCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationsBell from './NotificationsBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_state');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_state', JSON.stringify(isOpen));
  }, [isOpen]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  if (!user) return null;

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 dark:bg-[#0a0e1a] font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden print:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isOpen ? 280 : 0,
          opacity: isOpen ? 1 : 0
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0f1629] dark:bg-[#080c18] text-white shadow-2xl shadow-slate-900/50 transition-transform lg:static lg:translate-x-0 overflow-hidden print:hidden",
          !isOpen && "-translate-x-full lg:-translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <span className="font-extrabold text-white text-sm tracking-tight">AP</span>
            </div>
            <div className={cn("flex flex-col whitespace-nowrap", !isOpen && "hidden")}>
              <span className="font-bold tracking-tight text-[15px]">Performance</span>
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-[0.2em]">System</span>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" isOpen={isOpen} />

          <SidebarLink to="/self-evaluation" icon={<ClipboardCheck size={20} />} label="Self Evaluation" isOpen={isOpen} />

          <SidebarLink to="/evaluation" icon={<FileEdit size={20} />} label="New Evaluation" isOpen={isOpen} />

          {user.role === 'superadmin' && (
            <>
              <div className={cn("my-3 border-t border-white/[0.06]", !isOpen && "mx-0 my-3")} />
              <div className={cn("px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap", !isOpen && "hidden")}>
                Administration
              </div>
              <SidebarLink to="/employees" icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              } label="Employee Profiles" isOpen={isOpen} />

              <SidebarLink to="/users" icon={<Users size={20} />} label="Manage Users" isOpen={isOpen} />

              <SidebarLink to="/hr-settings" icon={<Settings size={20} />} label="HR Settings" isOpen={isOpen} />

              <SidebarLink to="/position-forms" icon={<ClipboardCheck size={20} />} label="Position Forms" isOpen={isOpen} />

              <SidebarLink to="/data-management" icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
              } label="Data Management" isOpen={isOpen} />

              <SidebarLink to="/audit-logs" icon={
                <div className="relative">
                  <span className="absolute w-2 h-2 rounded-full bg-red-500 -top-1 -right-1 animate-pulse" />
                  <ShieldAlert size={20} />
                </div>
              } label="Audit Logs" isOpen={isOpen} />
            </>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.04] rounded-2xl mb-2 whitespace-nowrap">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs uppercase shadow-md shadow-indigo-500/20">
              {user.name.slice(0, 2)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-bold">{user.name}</span>
              <span className="truncate text-[11px] font-semibold text-indigo-400 capitalize">{user.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400 whitespace-nowrap"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible relative">
        {/* Header */}
        <header className="sticky top-0 z-10 print:hidden">
          <div className="glass-card-strong border-x-0 border-t-0 rounded-none px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
              >
                <Menu size={18} />
              </button>
              <div>
                <div className="font-bold text-slate-800 dark:text-white tracking-tight text-[15px]">Annual Performance Dashboard</div>
                <div className="font-medium text-slate-500 dark:text-slate-400 text-xs hidden sm:block">Staff Evaluation Management System • ប្រព័ន្ធគ្រប់គ្រងការវាយតម្លៃបុគ្គលិក</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationsBell />
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-slate-200/60 dark:border-white/[0.08]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20">
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{user.name}</span>
                  <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 capitalize">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto print:overflow-visible p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label, isOpen }: { to: string; icon: React.ReactNode; label: string; isOpen: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap group",
          isActive
            ? "bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-500/10"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
        )
      }
    >
      {icon}
      <span className={cn(!isOpen && "hidden")}>{label}</span>
    </NavLink>
  );
}
