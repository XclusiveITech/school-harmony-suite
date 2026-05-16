import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { assets as initialAssets, assetAssignments, students, staff, type AssetAssignment, type Asset } from '@/lib/dummy-data';
import { Plus, Printer, Search, Edit2, Trash2, Link2, Users, GraduationCap, AlertTriangle, X } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import ReportFilters from '@/components/ReportFilters';

type Tab = 'register' | 'assignments' | 'report';
type AssignFilter = 'All' | 'Student' | 'Staff';

export default function Assets() {
  const [tab, setTab] = useState<Tab>('register');
  const [assetList, setAssetList] = useState<Asset[]>(initialAssets);
  const [assignments, setAssignments] = useState<AssetAssignment[]>(assetAssignments);
  const [showForm, setShowForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AssignFilter>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');

  // Assignment form
  const [form, setForm] = useState({
    assetId: '', serialNumber: '', assignedTo: '', assignedToType: 'Student' as 'Student' | 'Staff',
    roomNumber: '', condition: 'Good' as AssetAssignment['condition'], notes: '', dateAssigned: new Date().toISOString().split('T')[0],
  });

  // Register form
  const [regForm, setRegForm] = useState({
    name: '', category: '', purchaseDate: '', cost: '', depreciationRate: '', currentValue: '', location: '', serialNumbers: '',
  });

  const totalCost = assetList.reduce((s, a) => s + a.cost, 0);
  const totalCurrent = assetList.reduce((s, a) => s + a.currentValue, 0);

  const filtered = assignments.filter(a => {
    if (filterType !== 'All' && a.assignedToType !== filterType) return false;
    if (searchTerm && !a.assignedToName.toLowerCase().includes(searchTerm.toLowerCase()) && !a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) && !a.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (a.dateAssigned < dateFrom || a.dateAssigned > dateTo) return false;
    return true;
  });

  const conditionColors: Record<string, string> = {
    Excellent: 'bg-success/15 text-success', Good: 'bg-info/15 text-info', Fair: 'bg-warning/15 text-warning',
    Poor: 'bg-destructive/15 text-destructive', Damaged: 'bg-destructive/20 text-destructive',
  };

  // Get serial numbers for selected asset, excluding already assigned ones
  const selectedAsset = assetList.find(a => a.id === form.assetId);
  const assignedSerials = assignments.filter(a => a.assetId === form.assetId && a.id !== editId).map(a => a.serialNumber);
  const availableSerials = selectedAsset?.serialNumbers.filter(s => !assignedSerials.includes(s)) || [];

  // Get selected student info
  const selectedStudent = form.assignedToType === 'Student' ? students.find(s => s.id === form.assignedTo) : null;
  const selectedStaff = form.assignedToType === 'Staff' ? staff.find(s => s.id === form.assignedTo) : null;

  const resetForm = () => {
    setForm({ assetId: '', serialNumber: '', assignedTo: '', assignedToType: 'Student', roomNumber: '', condition: 'Good', notes: '', dateAssigned: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setShowForm(false);
  };

  const resetRegForm = () => {
    setRegForm({ name: '', category: '', purchaseDate: '', cost: '', depreciationRate: '', currentValue: '', location: '', serialNumbers: '' });
    setEditAssetId(null);
    setShowRegisterForm(false);
  };

  const handleSave = () => {
    const personList = form.assignedToType === 'Student' ? students : staff;
    const person = personList.find(p => p.id === form.assignedTo);
    const name = person ? `${(person as any).firstName} ${(person as any).lastName}` : '';
    if (editId) {
      setAssignments(prev => prev.map(a => a.id === editId ? { ...a, ...form, assignedToName: name } : a));
    } else {
      setAssignments(prev => [...prev, { id: String(Date.now()), ...form, assignedToName: name }]);
    }
    resetForm();
  };

  const handleRegisterSave = () => {
    const serials = regForm.serialNumbers.split(',').map(s => s.trim()).filter(Boolean);
    const newAsset: Asset = {
      id: editAssetId || String(Date.now()),
      name: regForm.name, category: regForm.category, purchaseDate: regForm.purchaseDate,
      cost: Number(regForm.cost), depreciationRate: Number(regForm.depreciationRate),
      currentValue: Number(regForm.currentValue), location: regForm.location, serialNumbers: serials,
    };
    if (editAssetId) {
      setAssetList(prev => prev.map(a => a.id === editAssetId ? newAsset : a));
    } else {
      setAssetList(prev => [...prev, newAsset]);
    }
    resetRegForm();
  };

  const handleEditAsset = (a: Asset) => {
    setRegForm({
      name: a.name, category: a.category, purchaseDate: a.purchaseDate, cost: String(a.cost),
      depreciationRate: String(a.depreciationRate), currentValue: String(a.currentValue), location: a.location,
      serialNumbers: a.serialNumbers.join(', '),
    });
    setEditAssetId(a.id);
    setShowRegisterForm(true);
    setTab('register');
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
          <p className="text-sm text-muted-foreground">{assetList.length} registered assets · {assignments.length} assignments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm(true); setTab('assignments'); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Link2 size={18} /> Assign Asset
          </button>
          <button onClick={() => { setShowRegisterForm(true); setTab('register'); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
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

      {/* ========== ASSET REGISTER TAB ========== */}
      {tab === 'register' && (
        <div className="space-y-4">
          {/* Register Form */}
          {showRegisterForm && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">{editAssetId ? 'Edit' : 'Register New'} Asset</h3>
                <button onClick={resetRegForm} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Asset Name *</label>
                  <input value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="e.g. Classroom Desks" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Category *</label>
                  <select value={regForm.category} onChange={e => setRegForm(p => ({ ...p, category: e.target.value }))} className={selectClass + ' w-full'}>
                    <option value="">Select Category</option>
                    {['Furniture', 'IT Equipment', 'Vehicles', 'Lab Equipment', 'Office Equipment', 'Sports Equipment', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Purchase Date *</label>
                  <input type="date" value={regForm.purchaseDate} onChange={e => setRegForm(p => ({ ...p, purchaseDate: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                  <input value={regForm.location} onChange={e => setRegForm(p => ({ ...p, location: e.target.value }))} className={inputClass} placeholder="e.g. Computer Lab" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Cost ($) *</label>
                  <input type="number" value={regForm.cost} onChange={e => setRegForm(p => ({ ...p, cost: e.target.value }))} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Depreciation Rate (%)</label>
                  <input type="number" value={regForm.depreciationRate} onChange={e => setRegForm(p => ({ ...p, depreciationRate: e.target.value }))} className={inputClass} placeholder="10" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Current Book Value ($)</label>
                  <input type="number" value={regForm.currentValue} onChange={e => setRegForm(p => ({ ...p, currentValue: e.target.value }))} className={inputClass} placeholder="0.00" />
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Serial Numbers *</label>
                  <input value={regForm.serialNumbers} onChange={e => setRegForm(p => ({ ...p, serialNumbers: e.target.value }))} className={inputClass} placeholder="SN-001, SN-002, SN-003 (comma separated)" />
                  <p className="text-xs text-muted-foreground mt-1">Separate multiple with commas</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleRegisterSave} disabled={!regForm.name || !regForm.category || !regForm.cost || !regForm.serialNumbers} className="px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50">
                  {editAssetId ? 'Update' : 'Register'} Asset
                </button>
                <button onClick={resetRegForm} className="px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-muted">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serial Numbers</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purchase Date</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Cost ($)</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Depr. Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Book Value ($)</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assetList.map(a => {
                  const assignCount = assignments.filter(x => x.assetId === a.id).length;
                  return (
                    <tr key={a.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {a.serialNumbers.slice(0, 3).map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-foreground">{s}</span>
                          ))}
                          {a.serialNumbers.length > 3 && <span className="text-xs text-muted-foreground">+{a.serialNumbers.length - 3} more</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.location}</td>
                      <td className="px-4 py-3 text-foreground">{a.purchaseDate}</td>
                      <td className="px-4 py-3 text-right text-foreground">${a.cost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-foreground">{a.depreciationRate}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">${a.currentValue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mr-1">{assignCount} assigned</span>
                          <button onClick={() => handleEditAsset(a)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== ASSET ASSIGNMENTS TAB ========== */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {showForm && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-foreground">{editId ? 'Edit' : 'New'} Asset Assignment</h3>
                <button onClick={resetForm} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Asset *</label>
                  <select value={form.assetId} onChange={e => setForm(p => ({ ...p, assetId: e.target.value, serialNumber: '' }))} className={selectClass + ' w-full'}>
                    <option value="">Select Asset</option>
                    {assetList.map(a => <option key={a.id} value={a.id}>{a.name} ({a.serialNumbers.length} items)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Serial Number *</label>
                  <select value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} className={selectClass + ' w-full'} disabled={!form.assetId}>
                    <option value="">{form.assetId ? 'Pick serial number' : 'Select asset first'}</option>
                    {availableSerials.map(s => <option key={s} value={s}>{s}</option>)}
                    {editId && form.serialNumber && !availableSerials.includes(form.serialNumber) && (
                      <option value={form.serialNumber}>{form.serialNumber} (current)</option>
                    )}
                  </select>
                  {form.assetId && availableSerials.length === 0 && !editId && (
                    <p className="text-xs text-destructive mt-1">All serial numbers are assigned</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Assign To</label>
                  <select value={form.assignedToType} onChange={e => setForm(p => ({ ...p, assignedToType: e.target.value as 'Student' | 'Staff', assignedTo: '' }))} className={selectClass + ' w-full'}>
                    <option value="Student">Student</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{form.assignedToType} *</label>
                  <select value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} className={selectClass + ' w-full'}>
                    <option value="">Select {form.assignedToType}</option>
                    {form.assignedToType === 'Student'
                      ? students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.regNumber})</option>)
                      : staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.employeeId})</option>)
                    }
                  </select>
                </div>

                {/* Auto-display student class or staff department */}
                {form.assignedTo && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      {form.assignedToType === 'Student' ? 'Class / Level' : 'Department'}
                    </label>
                    <div className="px-3 py-2.5 rounded-lg border border-input bg-muted text-foreground text-sm">
                      {selectedStudent ? `${selectedStudent.className} — ${selectedStudent.level}` : selectedStaff ? `${selectedStaff.department} — ${selectedStaff.role}` : '—'}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Room Number *</label>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Class/Dept</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Room</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Condition</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const asset = assetList.find(x => x.id === a.assetId);
                  const stu = a.assignedToType === 'Student' ? students.find(s => s.id === a.assignedTo) : null;
                  const stf = a.assignedToType === 'Staff' ? staff.find(s => s.id === a.assignedTo) : null;
                  const classDept = stu ? stu.className : stf ? stf.department : '—';
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
                      <td className="px-4 py-3 text-muted-foreground text-xs">{classDept}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.roomNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColors[a.condition]}`}>{a.condition}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.dateAssigned}</td>
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

      {/* ========== PRINTABLE REPORT TAB ========== */}
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

            {(filterType === 'All' || filterType === 'Student') && (
              <>
                <h4 className="font-display font-semibold text-foreground mt-4 mb-2 flex items-center gap-2"><GraduationCap size={16} /> Student Assignments</h4>
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b-2 border-primary">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Serial #</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Asset</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Class</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Room</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Condition</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(a => a.assignedToType === 'Student').map(a => {
                      const stu = students.find(s => s.id === a.assignedTo);
                      return (
                        <tr key={a.id} className="border-b border-border">
                          <td className="px-3 py-2 font-mono text-xs">{a.serialNumber}</td>
                          <td className="px-3 py-2">{assetList.find(x => x.id === a.assetId)?.name}</td>
                          <td className="px-3 py-2 font-medium">{a.assignedToName}</td>
                          <td className="px-3 py-2 text-xs">{stu?.className || '—'}</td>
                          <td className="px-3 py-2">{a.roomNumber}</td>
                          <td className="px-3 py-2">{a.condition}</td>
                          <td className="px-3 py-2">{a.dateAssigned}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {(filterType === 'All' || filterType === 'Staff') && (
              <>
                <h4 className="font-display font-semibold text-foreground mt-4 mb-2 flex items-center gap-2"><Users size={16} /> Staff Assignments</h4>
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b-2 border-primary">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Serial #</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Asset</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Staff Member</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Department</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Room</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Condition</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(a => a.assignedToType === 'Staff').map(a => {
                      const stf = staff.find(s => s.id === a.assignedTo);
                      return (
                        <tr key={a.id} className="border-b border-border">
                          <td className="px-3 py-2 font-mono text-xs">{a.serialNumber}</td>
                          <td className="px-3 py-2">{assetList.find(x => x.id === a.assetId)?.name}</td>
                          <td className="px-3 py-2 font-medium">{a.assignedToName}</td>
                          <td className="px-3 py-2 text-xs">{stf?.department || '—'}</td>
                          <td className="px-3 py-2">{a.roomNumber}</td>
                          <td className="px-3 py-2">{a.condition}</td>
                          <td className="px-3 py-2">{a.dateAssigned}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

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
