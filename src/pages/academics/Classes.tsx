import React from 'react';
import { classes } from '@/lib/dummy-data';
import { Plus, Users } from 'lucide-react';

export default function Classes() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Classes</h1>
          <p className="text-sm text-muted-foreground">{classes.length} classes across all levels</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Plus size={18} /> Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <div key={cls.id} className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-primary/10"><Users size={22} className="text-primary" /></div>
              <div>
                <h3 className="font-display font-semibold text-card-foreground">{cls.name}</h3>
                <p className="text-xs text-muted-foreground">{cls.level}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Students</span>
              <span className="text-lg font-display font-bold text-primary">{cls.students}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
