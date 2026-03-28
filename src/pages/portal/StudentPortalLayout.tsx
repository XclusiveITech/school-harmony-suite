import React from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { students, type Student } from '@/lib/dummy-data';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import {
  LayoutDashboard, Receipt, BookOpen, GraduationCap, ClipboardList,
  Award, Bell, LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { useState } from 'react';

function useStudentAuth(): Student | null {
  const stored = localStorage.getItem('brainstar_student');
  if (!stored) return null;
  return JSON.parse(stored);
}

const navItems = [
  { to: '/portal/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portal/fees', icon: Receipt, label: 'Fees Statement' },
  { to: '/portal/academics', icon: BookOpen, label: 'Academics' },
  { to: '/portal/assessment', icon: ClipboardList, label: 'Continuous Assessment' },
  { to: '/portal/exams', icon: GraduationCap, label: 'Examinations' },
  { to: '/portal/results', icon: Award, label: 'Results' },
  { to: '/portal/notices', icon: Bell, label: 'Notice Board' },
  { to: '/portal/profile', icon: UserCog, label: 'My Profile' },
];

export default function StudentPortalLayout() {
  const student = useStudentAuth();
  const navigate = useNavigate();
  const { settings } = useSchoolSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!student) return <Navigate to="/portal/login" replace />;

  const handleLogout = () => {
    localStorage.removeItem('brainstar_student');
    navigate('/portal/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        {settings.logo ? (
          <img src={settings.logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap size={18} className="text-sidebar-primary-foreground" />
          </div>
        )}
        {!collapsed && <span className="font-display font-bold text-sidebar-foreground text-sm truncate">Student Portal</span>}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`
            }
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full">
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col gradient-sidebar transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)} className="p-2 text-sidebar-foreground hover:bg-sidebar-accent mx-2 mb-2 rounded-lg">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 gradient-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground">
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">{student.firstName} {student.lastName}</p>
              <p className="text-xs text-muted-foreground">{student.className} • {student.regNumber}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">{settings.name}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet context={{ student }} />
        </main>
      </div>
    </div>
  );
}

export function usePortalStudent(): Student {
  const stored = localStorage.getItem('brainstar_student');
  if (!stored) throw new Error('No student logged in');
  return JSON.parse(stored);
}
