import React, { useEffect, useState } from 'react';
import {
  listSubjects, createSubject, deleteSubject, subjectClasses, listClasses,
  type BackendSubject, type BackendClass,
} from '@/lib/academics-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, BookOpen, Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Subjects() {
  const [subjects, setSubjects] = useState<BackendSubject[]>([]);
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'Theory' as 'Theory' | 'Practical', ca_percent: 30, classes: [] as string[], teacher_name: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([listSubjects(), listClasses()]);
      setSubjects(s);
      setClasses(c);
    } catch (e: any) {
      setError(e?.message || 'Failed to load subjects from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleClass = (name: string) =>
    setForm(f => ({ ...f, classes: f.classes.includes(name) ? f.classes.filter(x => x !== name) : [...f.classes, name] }));

  const save = async () => {
    if (!form.code || !form.name) { toast.error('Code and name are required'); return; }
    setSaving(true);
    try {
      const created = await createSubject(form);
      setSubjects(prev => [...prev, created]);
      setForm({ code: '', name: '', type: 'Theory', ca_percent: 30, classes: [], teacher_name: '' });
      setOpen(false);
      toast.success(`Subject "${created.name}" saved to the database`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save subject');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: BackendSubject) => {
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    try {
      await deleteSubject(s.id);
      setSubjects(prev => prev.filter(x => x.id !== s.id));
      toast.success('Subject deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete subject');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading from backend…' : `${subjects.length} subjects in the database`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setOpen(true)}><Plus size={18} className="mr-2" /> Add Subject</Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading subjects…
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No subjects in the database yet. Use “Add Subject” to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(sub => (
            <div key={sub.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10"><BookOpen size={20} className="text-primary" /></div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.type === 'Theory' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>{sub.type}</span>
                  <button onClick={() => remove(sub)} className="text-muted-foreground hover:text-destructive" title="Delete subject">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h3 className="font-display font-semibold text-card-foreground">{sub.name}</h3>
              <p className="text-xs text-muted-foreground">{sub.code}{sub.teacher_name ? ` • ${sub.teacher_name}` : ''}</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>CA Weight</span>
                  <span className="font-medium text-foreground">{sub.ca_percent}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Classes</span>
                  <span className="font-medium text-foreground">{subjectClasses(sub).length}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {subjectClasses(sub).map(c => (
                  <span key={c} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Code</label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MATH" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mathematics" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as 'Theory' | 'Practical', ca_percent: v === 'Practical' ? 40 : 30 }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Theory">Theory</SelectItem>
                    <SelectItem value="Practical">Practical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">CA Weight (%)</label>
                <Input type="number" value={form.ca_percent} onChange={e => setForm(f => ({ ...f, ca_percent: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Teacher</label>
              <Input value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Classes</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {classes.length === 0 && <p className="text-xs text-muted-foreground">No classes in the database yet.</p>}
                {classes.map(c => (
                  <button key={c.id} type="button" onClick={() => toggleClass(c.name)}
                    className={`px-2 py-1 rounded text-xs border ${form.classes.includes(c.name) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={save} className="w-full" disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Save Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
