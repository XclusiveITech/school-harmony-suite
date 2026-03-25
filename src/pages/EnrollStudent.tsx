import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRegNumber } from '@/lib/dummy-data';
import { Save, ArrowLeft } from 'lucide-react';

export default function EnrollStudent() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '', gender: 'Male',
    dateOfBirth: '', level: 'Form 1', className: 'Form 1A',
    boardingStatus: 'Day', parentName: '', parentEmail: '',
    parentPhone: '', address: '',
  });
  const [saved, setSaved] = useState<{ regNumber: string; username: string } | null>(null);

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const regNumber = generateRegNumber(form.firstName, form.lastName);
    setSaved({ regNumber, username: regNumber });
  };

  if (saved) {
    return (
      <div className="max-w-lg mx-auto mt-12 animate-fade-in">
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <Save size={28} className="text-success" />
          </div>
          <h2 className="font-display text-xl font-bold text-card-foreground mb-2">Student Enrolled Successfully!</h2>
          <div className="bg-muted rounded-lg p-4 mt-4 text-left space-y-2">
            <p className="text-sm text-muted-foreground">Registration Number: <span className="font-mono font-bold text-foreground">{saved.regNumber}</span></p>
            <p className="text-sm text-muted-foreground">Username: <span className="font-mono font-bold text-foreground">{saved.username}</span></p>
            <p className="text-sm text-muted-foreground">Temporary Password: <span className="font-mono font-bold text-foreground">test123</span></p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Student must change password on first login.</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setSaved(null); setForm({ firstName: '', lastName: '', middleName: '', gender: 'Male', dateOfBirth: '', level: 'Form 1', className: 'Form 1A', boardingStatus: 'Day', parentName: '', parentEmail: '', parentPhone: '', address: '' }); }} className="flex-1 py-2.5 rounded-lg border border-input text-foreground font-medium text-sm hover:bg-muted transition-colors">Enroll Another</button>
            <button onClick={() => navigate('/students')} className="flex-1 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">View Students</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/students')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Student Enrollment</h1>
          <p className="text-sm text-muted-foreground">Register a new student to the system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card space-y-6">
        <h3 className="font-display font-semibold text-card-foreground border-b border-border pb-3">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['firstName', 'First Name'], ['middleName', 'Middle Name'], ['lastName', 'Last Name']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground mb-1">{label} {key !== 'middleName' && <span className="text-destructive">*</span>}</label>
              <input type="text" value={(form as any)[key]} onChange={e => update(key, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" required={key !== 'middleName'} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Gender <span className="text-destructive">*</span></label>
            <select value={form.gender} onChange={e => update('gender', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Male</option><option>Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Date of Birth <span className="text-destructive">*</span></label>
            <input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Boarding Status</label>
            <select value={form.boardingStatus} onChange={e => update('boardingStatus', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Day</option><option>Boarding</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Level <span className="text-destructive">*</span></label>
            <select value={form.level} onChange={e => update('level', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Form 1</option><option>Form 2</option><option>Form 3</option><option>Form 4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Class <span className="text-destructive">*</span></label>
            <select value={form.className} onChange={e => update('className', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Form 1A</option><option>Form 2A</option><option>Form 2B</option><option>Form 3A</option><option>Form 4A</option>
            </select>
          </div>
        </div>

        <h3 className="font-display font-semibold text-card-foreground border-b border-border pb-3 pt-2">Parent/Guardian Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Parent/Guardian Name <span className="text-destructive">*</span></label>
            <input type="text" value={form.parentName} onChange={e => update('parentName', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Parent Email <span className="text-destructive">*</span></label>
            <input type="email" value={form.parentEmail} onChange={e => update('parentEmail', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Parent Phone <span className="text-destructive">*</span></label>
            <input type="tel" value={form.parentPhone} onChange={e => update('parentPhone', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Address <span className="text-destructive">*</span></label>
            <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            <Save size={18} /> Save & Create Accounts
          </button>
        </div>
      </form>
    </div>
  );
}
