'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, HeartHandshake, FileBarChart, Settings } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'ปฏิทิน', icon: Calendar, isActive: pathname === '/' || pathname.startsWith('/cases') },
    { href: '/students', label: 'นักเรียน', icon: Users, isActive: pathname.startsWith('/students') },
    { href: '/parents', label: 'ผู้ปกครอง', icon: HeartHandshake, isActive: pathname.startsWith('/parents') },
    { href: '/reports', label: 'รายงาน', icon: FileBarChart, isActive: pathname.startsWith('/reports') },
    { href: '/profile', label: 'ตั้งค่า', icon: Settings, isActive: pathname.startsWith('/profile') || pathname.startsWith('/admin') },
  ];

  return (
    <nav className="bottom-nav">
      {links.map((link) => {
        const Icon = link.icon;
        const active = link.isActive;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'active' : ''}
            style={{
              color: active ? 'var(--primary)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontWeight: active ? 600 : 400 }}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
