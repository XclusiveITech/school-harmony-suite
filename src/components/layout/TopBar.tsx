import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useBranch } from '@/contexts/BranchContext';
import { Bell, Moon, Sun, Search, Building2, ChevronDown } from 'lucide-react';

export default function TopBar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { branches, currentBranch, switchBranch } = useBranch();
  const [branchOpen, setBranchOpen] = useState(false);

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center gap-4 no-print">
      {/* Branch Selector */}
      <div className="relative">
        <button
          onClick={() => setBranchOpen(!branchOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
        >
          <Building2 size={16} />
          <span className="hidden sm:inline">{currentBranch.name}</span>
          <span className="sm:hidden">{currentBranch.code}</span>
          <ChevronDown size={14} />
        </button>
        {branchOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBranchOpen(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[220px] py-1">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => { switchBranch(b.id); setBranchOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${b.id === currentBranch.id ? 'text-primary font-medium bg-primary/5' : 'text-foreground'}`}
                >
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.code} · {b.address}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 lg:ml-0 ml-2">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search modules, students, staff..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative">
        <Bell size={20} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
      </button>
    </header>
  );
}
