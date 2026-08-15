import React, { useEffect, useState } from 'react';
import { listClasses, createClass, deleteClass, type BackendClass } from '@/lib/academics-api';
import { listStudents, type BackendStudent } from '@/lib/students-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Classes() {
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [students, setStudents] = useState<BackendStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', level: '', capacity: 40, class_teacher: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([listClasses(), listStudents()]);
      setClasses(c);
      setStudents(s);
    } catch (e: any) {
      setError(e?.message || 'Failed to load classes from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const countFor = (cls: BackendClass) =>
    typeof cls.student_count === 'number'
      ? cls.student_count
      : students.filter(s => s.class_name === cls.name).length;

  const save = async () => {
    if (!form.name || !form.level) { toast.error('Name and level are required'); return; }
    setSaving(true);
    try {
      const created = await createClass(form);
      setClasses(prev => [...prev, created]);
      setForm({ name: '', level: '', capacity: 40, class_teacher: '' });
      setOpen(false);
      toast.success(`Class "${created.name}" saved to the database`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save class');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cls: BackendClass) => {
    if (!confirm(`Delete class "${cls.name}"?`)) return;
    try {
      await deleteClass(cls.id);
      setClasses(prev => prev.filter(c => c.id !== cls.id));
      toast.success('Class deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete class');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading from backend…' : `${classes.length} classes in the database`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setOpen(true)}><Plus size={18} className="mr-2" /> Add Class</Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading classes…
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No classes in the database yet. Use “Add Class” to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-primary/10"><Users size={22} className="text-primary" /></div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-card-foreground">{cls.name}</h3>
                  <p className="text-xs text-muted-foreground">{cls.level}{cls.class_teacher ? ` • ${cls.class_teacher}` : ''}</p>
                </div>
                <button onClick={() => remove(cls)} className="text-muted-foreground hover:text-destructive" title="Delete class">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Students{cls.capacity ? ` / ${cls.capacity}` : ''}</span>
                <span className="text-lg font-display font-bold text-primary">{countFor(cls)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Class</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Class Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Form 3A" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Level</label>
              <Input value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} placeholder="O Level" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Capacity</label>
                <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Class Teacher</label>
                <Input value={form.class_teacher} onChange={e => setForm(f => ({ ...f, class_teacher: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <Button onClick={save} className="w-full" disabled={saving}>
              {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Save Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
