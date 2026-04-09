import React, { useState } from 'react';
import { useBranch, Branch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Plus, Edit2, Printer, MapPin, Phone, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function BranchManagement() {
  const { user } = useAuth();
  const { branches, addBranch, updateBranch, currentBranch, switchBranch } = useBranch();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', status: 'Active' as 'Active' | 'Inactive' });

  if (user?.role !== 'superadmin' && user?.role !== 'admin') {
    return <div className="p-8 text-center text-muted-foreground">Access denied. Only administrators can manage branches.</div>;
  }

  const resetForm = () => {
    setForm({ name: '', code: '', address: '', phone: '', status: 'Active' });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (b: Branch) => {
    setForm({ name: b.name, code: b.code, address: b.address, phone: b.phone, status: b.status });
    setEditId(b.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error('Branch name and code are required');
      return;
    }
    if (editId) {
      updateBranch(editId, form);
      toast.success('Branch updated successfully');
    } else {
      addBranch(form);
      toast.success('Branch added successfully');
    }
    resetForm();
  };

  const toggleStatus = (b: Branch) => {
    const newStatus = b.status === 'Active' ? 'Inactive' : 'Active';
    updateBranch(b.id, { status: newStatus });
    toast.success(`${b.name} is now ${newStatus}`);
  };

  const activeBranches = branches.filter(b => b.status === 'Active').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Branch Management</h1>
          <p className="text-sm text-muted-foreground">{branches.length} branches · {activeBranches} active</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors print:hidden">
            <Printer size={18} /> Print
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors print:hidden">
            <Plus size={18} /> Add Branch
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <Card className="light-card-blue">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="text-primary" size={20} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{branches.length}</p>
                <p className="text-xs text-muted-foreground">Total Branches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="light-card-green">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><ToggleRight className="text-success" size={20} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeBranches}</p>
                <p className="text-xs text-muted-foreground">Active Branches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="light-card-amber">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><ToggleLeft className="text-warning" size={20} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{branches.length - activeBranches}</p>
                <p className="text-xs text-muted-foreground">Inactive Branches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">{editId ? 'Edit Branch' : 'Add New Branch'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Branch Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="e.g. Brainstar Mutare" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Branch Code *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="e.g. MUT" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Full address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="+263..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-input text-foreground text-sm hover:bg-muted">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">{editId ? 'Update' : 'Add'} Branch</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Branch List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map(b => (
          <Card key={b.id} className={`relative ${b.id === currentBranch.id ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="text-primary" size={20} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{b.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground">{b.code}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {b.status}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2"><MapPin size={14} /> {b.address}</div>
                <div className="flex items-center gap-2"><Phone size={14} /> {b.phone}</div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => handleEdit(b)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-input text-foreground text-sm hover:bg-muted transition-colors">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => toggleStatus(b)} className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${b.status === 'Active' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-success/10 text-success hover:bg-success/20'}`}>
                  {b.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
                {b.id !== currentBranch.id && b.status === 'Active' && (
                  <button onClick={() => switchBranch(b.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                    Switch To
                  </button>
                )}
              </div>
              {b.id === currentBranch.id && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">Current</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
