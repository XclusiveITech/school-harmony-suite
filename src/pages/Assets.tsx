import React, { useState } from 'react';
import { assets, assetAssignments, students, staff, type AssetAssignment } from '@/lib/dummy-data';
import { Plus, Download, Printer, Search, Filter, Edit2, Trash2, Link2, Building2, Users, GraduationCap, AlertTriangle } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';

type Tab = 'register' | 'assignments' | 'report';
type AssignFilter = 'All' | 'Student' | 'Staff';

export default function Assets() {
  const [tab, setTab] = useState<Tab>('register');
  const [assignments, setAssignments] = useState<AssetAssignment[]>(assetAssignments);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AssignFilter>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  // Form state
  const [form, setForm] = useState({
    assetId: '', serialNumber: '', assignedTo: '', assignedToType: 'Student' as 'Student' | 'Staff',
    roomNumber: '', condition: 'Good' as AssetAssignment['condition'], notes: '', dateAssigned: new Date().toISOString().split('T')[0],
  });

  const totalCost = assets.reduce((s, a) => s + a.cost, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);

  const filtered = assignments.filter(a => {
    if (filterType !== 'All' && a.assignedToType !== filterType) return false;
    if (searchTerm && !a.assignedToName.toLowerCase().includes(searchTerm.toLowerCase()) && !a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) && !a.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (a.dateAssigned < dateFrom || a.dateAssigned > dateTo) return false;
    return true;
  });

  const conditionColors: Record<string, string> = {
    Excellent: 'bg-success/15 text-success',
    Good: 'bg-info/15 text-info',
    Fair: 'bg-warning/15 text-warning',
    Poor: 'bg-destructive/15 text-destructive',
    Damaged: 'bg-destructive/20 text-destructive',
  };

  const resetForm = () => {
    setForm({ assetId: '', serialNumber: '', assignedTo: '', assignedToType: 'Student', roomNumber: '', condition: 'Good', notes: '', dateAssigned: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = () => {
    const personList = form.assignedToType === 'Student' ? students : staff;
    const person = personList.find(p => p.id === form.assignedTo);
    const name = person ? (form.assignedToType === 'Student' ? `${(person as any).firstName} ${(person as any).lastName}` : `${(person as any).firstName} ${(person as any).lastName}`) : '';

    if (editId) {
      setAssignments(prev => prev.map(a => a.id === editId ? { ...a, ...form, assignedToName: name } : a));
    } else {
      const newA: AssetAssignment = { id: String(Date.now()), ...form, assignedToName: name };
      setAssignments(prev => [...prev, newA]);
    }
    resetForm();
  };

  const handleEdit = (a: AssetAssignment) => {
    setForm({ assetId: a.assetId, serialNumber: a.serialNumber, assignedTo: a.assignedTo, assignedToType: a.assignedToType, roomNumber: a.roomNumber, condition: a.condition, notes: a.notes || '', dateAssigned: a.dateAssigned });
    setEditId(a.id);
    setShowForm(true);
    setTab('assignments');
  };

  const handleDelete = (id: string) => setAssignments(prev => prev.filter(a => a.id !== id));

  const studentAssignCount = assignments.filter(a => a.assignedToType === 'Student').length;
  const staffAssignCount = assignments.filter(a => a.assignedToType === 'Staff').length;
  const damagedCount = assignments.filter(a => a.condition === 'Poor' || a.condition === 'Damaged').length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'register', label: 'Asset Register' },
    { key: 'assignments', label: 'Asset Assignments' },
    { key: 'report', label: 'Printable Report' },
  ];

  const selectClass = "px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Asset Management</h1>
          <p className="text-sm text-muted-foreground">{assets.length} registered assets · {assignments.length} assignments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm(true); setTab('assignments'); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Link2 size={18} /> Assign Asset
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={18} /> Register Asset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-5 shadow-card light-card-blue">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">${totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card light-card-green">
          <p className="text-sm text-muted-foreground">Book Value</p>
          <p className="text-2xl font-display font-bold text-success mt-1">${totalCurrent.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card light-card-orange">
          <p className="text-sm text-muted-foreground">Depreciation</p>
          <p className="text-2xl font-display font-bold text-warning mt-1">${(totalCost - totalCurrent).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card light-card-cyan">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap size={16} /> Student Items</div>
          <p className="text-2xl font-display font-bold text-info mt-1">{studentAssignCount}</p>
        </div>
        <div className="bg-card rounded-xl p-5 shadow-card light-card-purple">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users size={16} /> Staff Items</div>
          <p className="text-2xl font-display font-bold text-card-foreground mt-1">{staffAssignCount}</p>
        </div>
      </div>

      {damagedCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle size={16} /> {damagedCount} item(s) in Poor/Damaged condition — need attention
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 print:hidden">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Asset Register */}
      {tab === 'register' && (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purchase Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost ($)</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Depr. Rate</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Book Value ($)</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => {
                const assignCount = assignments.filter(x => x.assetId === a.id).length;
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.location}</td>
                    <td className="px-4 py-3 text-foreground">{a.purchaseDate}</td>
                    <td className="px-4 py-3 text-right text-foreground">${a.cost.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-foreground">{a.depreciationRate}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">${a.currentValue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{assignCount} items</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Asset Assignments */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {/* Assignment Form */}
          {showForm && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
              <h3 className="font-display font-semibold text-foreground">{editId ? 'Edit' : 'New'} Asset Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Asset</label>
                  <select value={form.assetId} onChange={e => setForm(p => ({ ...p, assetId: e.target.value }))} className={selectClass + ' w-full'}>
                    <option value="">Select Asset</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Serial Number</label>
                  <input value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} className={inputClass} placeholder="e.g. FRN-DESK-005" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Assign To</label>
                  <select value={form.assignedToType} onChange={e => setForm(p => ({ ...p, assignedToType: e.target.value as 'Student' | 'Staff', assignedTo: '' }))} className={selectClass + ' w-full'}>
                    <option value="Student">Student</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{form.assignedToType}</label>
                  <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} className={selectClass + ' w-full'}>
                    <option value="">Select {form.assignedToType}</option>
                    {form.assignedToType === 'Student'
                      ? students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)
                      : staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.employeeId})</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Room Number</label>
                  <input value={form.roomNumber} onChange={e => setForm(p => ({ ...p, roomNumber: e.target.value }))} className={inputClass} placeholder="e.g. Room 3A" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Condition</label>
                  <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value as AssetAssignment['condition'] }))} className={selectClass + ' w-full'}>
                    {['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date Assigned</label>
                  <input type="date" value={form.dateAssigned} onChange={e => setForm(p => ({ ...p, dateAssigned: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={!form.assetId || !form.serialNumber || !form.assignedTo || !form.roomNumber} className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50">
                  {editId ? 'Update' : 'Save'} Assignment
                </button>
                <button onClick={resetForm} className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-muted">Cancel</button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name, serial, room..." className={inputClass + ' pl-9'} />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as AssignFilter)} className={selectClass}>
              <option value="All">All Types</option>
              <option value="Student">Students</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serial #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned To</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Room</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Condition</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Notes</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const asset = assets.find(x => x.id === a.assetId);
                  return (
                    <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{a.serialNumber}</td>
                      <td className="px-4 py-3 text-foreground">{asset?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${a.assignedToType === 'Student' ? 'text-info' : 'text-primary'}`}>
                          {a.assignedToType === 'Student' ? <GraduationCap size={12} /> : <Users size={12} />} {a.assignedToType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{a.assignedToName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.roomNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColors[a.condition]}`}>{a.condition}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.dateAssigned}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{a.notes || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(a)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No assignments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Report */}
      {tab === 'report' && (
        <div className="space-y-4">
          <div className="print:hidden">
            <ReportFilters dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}>
              <select value={filterType} onChange={e => setFilterType(e.target.value as AssignFilter)} className={selectClass}>
                <option value="All">All Types</option>
                <option value="Student">Students Only</option>
                <option value="Staff">Staff Only</option>
              </select>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90">
                <Printer size={16} /> Print Report
              </button>
            </ReportFilters>
          </div>

          <div className="bg-card rounded-xl shadow-card p-6 print:shadow-none print:p-0">
            <ReportHeader reportTitle="Asset Assignment Report" subtitle={`${filterType === 'All' ? 'All' : filterType} Assignments — ${dateFrom} to ${dateTo}`} />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Total Assignments</p>
                <p className="text-lg font-bold text-foreground">{filtered.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Student Items</p>
                <p className="text-lg font-bold text-info">{filtered.filter(a => a.assignedToType === 'Student').length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Staff Items</p>
                <p className="text-lg font-bold text-primary">{filtered.filter(a => a.assignedToType === 'Staff').length}</p>
              </div>
            </div>

            {/* Student Section */}
            {(filterType === 'All' || filterType === 'Student') && (
              <>
                <h4 className="font-display font-semibold text-foreground mt-4 mb-2 flex items-center gap-2"><GraduationCap size={16} /> Student Assignments</h4>
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b-2 border-primary">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Serial #</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Asset</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Student Name</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Room</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Condition</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(a => a.assignedToType === 'Student').map(a => (
                      <tr key={a.id} className="border-b border-border">
                        <td className="px-3 py-2 font-mono text-xs">{a.serialNumber}</td>
                        <td className="px-3 py-2">{assets.find(x => x.id === a.assetId)?.name}</td>
                        <td className="px-3 py-2 font-medium">{a.assignedToName}</td>
                        <td className="px-3 py-2">{a.roomNumber}</td>
                        <td className="px-3 py-2">{a.condition}</td>
                        <td className="px-3 py-2">{a.dateAssigned}</td>
                        <td className="px-3 py-2 text-xs">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Staff Section */}
            {(filterType === 'All' || filterType === 'Staff') && (
              <>
                <h4 className="font-display font-semibold text-foreground mt-4 mb-2 flex items-center gap-2"><Users size={16} /> Staff Assignments</h4>
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b-2 border-primary">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Serial #</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Asset</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Staff Member</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Room</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Condition</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(a => a.assignedToType === 'Staff').map(a => (
                      <tr key={a.id} className="border-b border-border">
                        <td className="px-3 py-2 font-mono text-xs">{a.serialNumber}</td>
                        <td className="px-3 py-2">{assets.find(x => x.id === a.assetId)?.name}</td>
                        <td className="px-3 py-2 font-medium">{a.assignedToName}</td>
                        <td className="px-3 py-2">{a.roomNumber}</td>
                        <td className="px-3 py-2">{a.condition}</td>
                        <td className="px-3 py-2">{a.dateAssigned}</td>
                        <td className="px-3 py-2 text-xs">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Condition Summary */}
            <h4 className="font-display font-semibold text-foreground mt-4 mb-2">Condition Summary</h4>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              {['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'].map(c => (
                <div key={c} className="p-2 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">{c}</p>
                  <p className="text-lg font-bold text-foreground">{filtered.filter(a => a.condition === c).length}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
