import React from 'react';
import { subjects, classes } from '@/lib/dummy-data';
import { Plus, BookOpen, Users } from 'lucide-react';

export default function Subjects() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Subjects</h1>
          <p className="text-sm text-muted-foreground">{subjects.length} subjects configured</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus size={18} /> Add Subject
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(sub => (
          <div key={sub.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10"><BookOpen size={20} className="text-primary" /></div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.type === 'Theory' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>{sub.type}</span>
            </div>
            <h3 className="font-display font-semibold text-card-foreground">{sub.name}</h3>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>CA Weight</span>
                <span className="font-medium text-foreground">{sub.caPercent}%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Classes</span>
                <span className="font-medium text-foreground">{sub.classes.length}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {sub.classes.map(c => (
                <span key={c} className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
