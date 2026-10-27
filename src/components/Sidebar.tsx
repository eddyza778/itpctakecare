'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  Database,
  HeartHandshake,
  FileBarChart,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { SchoolLogo } from './SchoolLogo';

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, isAdmin, logout } = useAuth();

  const navItems = [
    {
      name: 'ปฏิทิน',
      href: '/',
      icon: Calendar,
      isActive: pathname === '/' || pathname.startsWith('/cases'),
    },
    {
      name: 'นักเรียน',
      href: '/students',
      icon: Users,
      isActive: pathname.startsWith('/students'),
    },
    {
      name: 'จัดการข้อมูล',
      href: '/admin',
      icon: Database,
      isActive: pathname.startsWith('/admin'),
      adminOnly: true,
    },
    {
      name: 'ผู้ปกครอง',
      href: '/parents',
      icon: HeartHandshake,
      isActive: pathname.startsWith('/parents'),
    },
    {
      name: 'รายงาน',
      href: '/reports',
      icon: FileBarChart,
      isActive: pathname.startsWith('/reports'),
    },
    {
      name: 'ตั้งค่า',
      href: '/profile',
      icon: Settings,
      isActive: pathname.startsWith('/profile'),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--surface)' }}>
      {/* Top Branding Section */}
      <div
        style={{
          padding: '20px 20px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }} onClick={onItemClick}>
          <SchoolLogo size="md" showText={true} />
        </Link>
      </div>

      {/* Navigation List */}
      <div style={{ flex: 1, padding: '16px 14px', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.688rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
            padding: '0 10px 10px',
          }}
        >
          เมนูหลัก
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const active = item.isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={`sidebar-nav-item ${active ? 'active' : ''}`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)', flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>{item.name}</span>
                {item.name === 'จัดการข้อมูล' && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      background: 'var(--accent)',
                      color: 'var(--primary-dark)',
                      padding: '2px 6px',
                      borderRadius: '100px',
                      fontWeight: 600,
                    }}
                  >
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link
            href="/profile"
            onClick={onItemClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--primary-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: '1.5px solid var(--primary-light)',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : currentUser?.name ? (
                currentUser.name.charAt(0)
              ) : (
                <User size={18} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentUser?.name || 'ผู้ใช้งาน'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '0.688rem',
                    fontWeight: 600,
                    color: isAdmin ? 'var(--primary-dark)' : 'var(--text-secondary)',
                    backgroundColor: isAdmin ? 'var(--accent)' : 'var(--border-light)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {isAdmin ? 'ผู้ดูแลระบบ' : 'ครูผู้ดูแล'}
                </span>
              </div>
            </div>
          </Link>

          <button
            onClick={logout}
            title="ออกจากระบบ"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.backgroundColor = '#fde8e8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
