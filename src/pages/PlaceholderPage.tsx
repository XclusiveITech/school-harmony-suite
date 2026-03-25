import React from 'react';
import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')).join(' > ');

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
      <div className="p-4 rounded-2xl bg-primary/10 mb-4">
        <Construction size={40} className="text-primary" />
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">{pageName}</h1>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        This module is ready for implementation. Navigate through the sidebar to explore available modules.
      </p>
    </div>
  );
}
