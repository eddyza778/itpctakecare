'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LoginPage } from '@/components/LoginPage';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { SchoolLogo } from '@/components/SchoolLogo';
import { Menu, X } from 'lucide-react';
import { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--background)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '3px solid var(--accent)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          กำลังโหลดข้อมูลโรงเรียน...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Desktop Sidebar (hidden on mobile, visible on desktop >=768px) */}
      <aside className="desktop-sidebar">
        <Sidebar />
      </aside>

      {/* Mobile Topbar (visible on mobile <768px, hidden on desktop) */}
      <header className="mobile-topbar">
        <SchoolLogo size="sm" showText={true} />
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          aria-label="Toggle navigation drawer"
          style={{
            background: 'var(--accent)',
            border: 'none',
            color: 'var(--primary-dark)',
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Offcanvas Drawer */}
      {mobileDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(53, 38, 63, 0.45)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Drawer content */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              maxWidth: '82vw',
              background: 'var(--surface)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
              zIndex: 61,
            }}
          >
            <Sidebar onItemClick={() => setMobileDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="app-main">
        {children}
      </main>

      {/* Mobile Bottom Navigation (strictly hidden on desktop >=768px) */}
      <div className="mobile-bottom-nav">
        <BottomNav />
      </div>
    </div>
  );
}
