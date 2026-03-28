import React from 'react';
import { announcements } from '@/lib/dummy-data';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function PortalNotices() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-foreground">Notice Board</h1>

      <div className="space-y-4">
        {announcements.map(n => (
          <div key={n.id} className={`bg-card rounded-xl shadow-card overflow-hidden ${n.priority === 'high' ? 'light-card-red' : n.priority === 'medium' ? 'light-card-orange' : 'light-card-green'}`}>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${n.priority === 'high' ? 'bg-destructive/10' : n.priority === 'medium' ? 'bg-warning/10' : 'bg-success/10'}`}>
                  {n.priority === 'high' ? <AlertTriangle size={20} className="text-destructive" /> :
                   n.priority === 'medium' ? <Bell size={20} className="text-warning" /> :
                   <Info size={20} className="text-success" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{n.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${n.priority === 'high' ? 'bg-destructive/10 text-destructive' : n.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                      {n.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{n.content}</p>
                  <p className="text-xs text-muted-foreground">Posted: {n.date}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
