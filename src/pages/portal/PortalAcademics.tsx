import React, { useState } from 'react';
import { usePortalStudent } from './StudentPortalLayout';
import { subjects, staff } from '@/lib/dummy-data';
import { BookOpen, Plus, X, Check } from 'lucide-react';

export default function PortalAcademics() {
  const student = usePortalStudent();
  const allSubjectsForClass = subjects.filter(s => s.classes.includes(student.className));
  const [registered, setRegistered] = useState<string[]>(allSubjectsForClass.map(s => s.id));
  const [showRegister, setShowRegister] = useState(false);

  const availableToAdd = subjects.filter(s => !registered.includes(s.id) && !s.classes.includes(student.className));
  const mySubjects = subjects.filter(s => registered.includes(s.id));

  const handleDrop = (id: string) => {
    if (confirm('Are you sure you want to drop this subject?')) {
      setRegistered(prev => prev.filter(r => r !== id));
    }
  };

  const handleAdd = (id: string) => {
    setRegistered(prev => [...prev, id]);
    setShowRegister(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Subjects</h1>
          <p className="text-sm text-muted-foreground">{student.className} • {mySubjects.length} subjects registered</p>
        </div>
        <button onClick={() => setShowRegister(!showRegister)} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm">
          <Plus size={16} /> Register Subject
        </button>
      </div>

      {showRegister && (
        <div className="bg-card rounded-xl shadow-card p-4 border-2 border-primary/20">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Available Subjects to Register</h3>
          {availableToAdd.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional subjects available. All subjects for your level are registered.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {availableToAdd.map(s => (
                <button key={s.id} onClick={() => handleAdd(s.id)} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted text-left">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.type} • CA: {s.caPercent}%</p>
                  </div>
                  <Plus size={16} className="text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mySubjects.map(s => {
          const teacher = staff.find(st => st.id === s.teacherId);
          return (
            <div key={s.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className={`h-1.5 ${s.type === 'Practical' ? 'bg-warning' : 'bg-primary'}`} />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${s.type === 'Theory' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>{s.type}</span>
                  </div>
                  <button onClick={() => handleDrop(s.id)} className="text-muted-foreground hover:text-destructive" title="Drop subject">
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Teacher: <span className="text-foreground">{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'TBA'}</span></p>
                  <p>CA Weight: <span className="text-foreground">{s.caPercent}%</span></p>
                  <p>Exam Weight: <span className="text-foreground">{100 - s.caPercent}%</span></p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-success">
                  <Check size={14} /> Registered
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
