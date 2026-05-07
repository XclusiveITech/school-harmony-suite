import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSchoolSettings } from '@/contexts/SchoolSettingsContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, FileText, DollarSign,
  ClipboardList, Settings, LogOut, ChevronDown, ChevronRight, Building2,
  Package, Landmark, UserCog, Calendar, BarChart3, Receipt, CreditCard,
  Warehouse, TrendingUp, Bell, Menu, X, ShoppingCart
} from 'lucide-react';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  {
    label: 'Learners', icon: <GraduationCap size={20} />,
    children: [
      { label: 'All Students', path: '/students' },
      { label: 'Enrollment', path: '/students/enroll' },
      { label: 'Attendance', path: '/attendance' },
    ]
  },
  {
    label: 'Academics', icon: <BookOpen size={20} />,
    children: [
      { label: 'Subjects', path: '/academics/subjects' },
      { label: 'Classes', path: '/academics/classes' },
      { label: 'Timetable', path: '/academics/timetable' },
      { label: 'Continuous Assessment', path: '/academics/assessment' },
    ]
  },
  {
    label: 'Examinations', icon: <ClipboardList size={20} />,
    children: [
      { label: 'Exam Types', path: '/exams/types' },
      { label: 'Exam Schedule', path: '/exams/schedule' },
      { label: 'Marks Entry', path: '/exams/marks' },
      { label: 'Results', path: '/exams/results' },
      { label: 'Evaluation Reports', path: '/exams/evaluation' },
    ]
  },
  {
    label: 'Finance', icon: <DollarSign size={20} />,
    children: [
      { label: 'General Ledger', path: '/finance/gl' },
      { label: 'Cashbook', path: '/finance/cashbook' },
      { label: 'Journals', path: '/finance/journals' },
      { label: 'Invoices', path: '/finance/invoices' },
      { label: 'Receipts', path: '/finance/receipts' },
      { label: 'Currency & Payments', path: '/finance/currency' },
      { label: 'Creditors (AP)', path: '/finance/creditors' },
      { label: 'Debtors (AR)', path: '/finance/debtors' },
      { label: 'Bank Reconciliation', path: '/finance/bank-recon' },
      { label: 'Creditors Reconciliation', path: '/finance/creditors-recon' },
      { label: 'Debtors Reconciliation', path: '/finance/debtors-recon' },
      { label: 'Tuckshop Accounting', path: '/finance/tuckshop-accounting' },
    ]
  },
  {
    label: 'Financial Reports', icon: <BarChart3 size={20} />,
    children: [
      { label: 'Trial Balance', path: '/reports/trial-balance' },
      { label: 'Balance Sheet', path: '/reports/balance-sheet' },
      { label: 'Income Statement', path: '/reports/income-statement' },
      { label: 'Cumulative Income (All Branches)', path: '/reports/cumulative-income' },
      { label: 'Fees Statement', path: '/reports/fees-statement' },
      { label: 'Fees Balances', path: '/reports/fees-balances' },
      { label: 'Account Transactions', path: '/reports/account-transactions' },
    ]
  },
  {
    label: 'HR Management', icon: <UserCog size={20} />,
    children: [
      { label: 'Staff List', path: '/hr/staff' },
      { label: 'Recruitment', path: '/hr/recruitment' },
      { label: 'Leave Management', path: '/hr/leave' },
      { label: 'Payroll', path: '/hr/payroll' },
      { label: 'Credentials', path: '/hr/credentials' },
      { label: 'Departments', path: '/hr/departments' },
    ]
  },
  { label: 'Assets', path: '/assets', icon: <Building2 size={20} /> },
  { label: 'Inventory', path: '/inventory', icon: <Package size={20} /> },
  { label: 'Tuckshop', path: '/tuckshop', icon: <ShoppingCart size={20} /> },
  {
    label: 'Administration', icon: <Settings size={20} />,
    roles: ['superadmin', 'admin'],
    children: [
      { label: 'School Settings', path: '/admin/settings' },
      { label: 'Branch Management', path: '/admin/branches' },
      { label: 'Roles & Permissions', path: '/admin/roles' },
      { label: 'Announcements', path: '/admin/announcements' },
    ]
  },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const { settings } = useSchoolSettings();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path?: string) => path && location.pathname === path;
  const isGroupActive = (item: NavItem) =>
    item.children?.some(c => location.pathname === c.path);

  const renderNav = () => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {navItems.map(item => {
        if (item.roles && user && !item.roles.includes(user.role)) return null;

        if (item.children) {
          const groupActive = isGroupActive(item);
          const open = expanded[item.label] ?? groupActive;
          return (
            <div key={item.label}>
              <button
                onClick={() => toggle(item.label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  groupActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {open && (
                <div className="ml-8 mt-1 space-y-0.5">
                  {item.children.map(child => (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive(child.path)
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path!}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card shadow-card text-foreground"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 gradient-sidebar flex flex-col transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-sidebar-border">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Landmark size={20} className="text-sidebar-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="font-display text-base font-bold text-sidebar-primary-foreground">Brainstar</h1>
            <p className="text-xs text-sidebar-muted">School Management</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden ml-auto text-sidebar-foreground">
            <X size={20} />
          </button>
        </div>

        {renderNav()}

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-primary">
              {user?.name?.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
            </div>
            <button onClick={logout} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
