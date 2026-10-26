'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function BottomNav() {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  return (
    <nav className="bottom-nav">
      <Link
        href="/"
        className={pathname === '/' || pathname.startsWith('/cases') ? 'active' : ''}
      >
        <Calendar size={22} strokeWidth={1.8} />
        <span>ปฏิทิน</span>
      </Link>
      <Link
        href="/students"
        className={pathname.startsWith('/students') ? 'active' : ''}
      >
        <Users size={22} strokeWidth={1.8} />
        <span>นักเรียน</span>
      </Link>
      <button onClick={logout} title={`ออกจากระบบ (${currentUser?.name})`}>
        <LogOut size={22} strokeWidth={1.8} />
        <span>ออก</span>
      </button>
    </nav>
  );
}
