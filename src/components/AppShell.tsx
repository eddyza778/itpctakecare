'use client';

import { useAuth } from '@/lib/auth';
import { LoginPage } from '@/components/LoginPage';
import { BottomNav } from '@/components/BottomNav';
import { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="app-content" style={{ paddingBottom: '68px' }}>
        {children}
      </div>
      <BottomNav />
    </>
  );
}
