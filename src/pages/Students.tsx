import React, { useEffect, useState } from 'react';
import { Search, Eye, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listStudents, type BackendStudent } from '@/lib/students-api';

export default function Students() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [rows, setRows] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listStudents());
    } catch (e: any) {
      setError(e?.message || 'Failed to load students from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(s => {
    const matchSearch = `${s.first_name} ${s.last_name} ${s.student_no}`.toLowerCase().includes(search.toLowerCase());
    const matchLevel = !levelFilter || s.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const levels = [...new Set(rows.map(s => s.level).filter(Boolean))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading from database…' : `${rows.length} total students enrolled`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link to="/students/enroll" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> Enroll Student
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or reg number..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
        </div>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Levels</option>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reg No.</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Level</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Guardian</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No students found in the database.</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{s.student_no}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.level}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.class_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.residence === 'Boarding' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                      {s.residence}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.guardian_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
