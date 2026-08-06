import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import ModuleBreadcrumbs from './ModuleBreadcrumbs';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;


  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <ModuleBreadcrumbs />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
