'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Caretaker } from '@/lib/types';
import { getSessionCaretaker } from '@/lib/queries';

interface AuthContextType {
  currentUser: Caretaker | null;
  isAdmin: boolean;
  login: (caretaker: Caretaker) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isAdmin: false,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

const STORAGE_KEY = 'itpc_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Caretaker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    let parsed: Caretaker | null = null;
    try {
      parsed = JSON.parse(stored);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setIsLoading(false);
      return;
    }

    // ตรวจกับฐานข้อมูลทุกครั้ง: role ล่าสุด / บัญชีถูกปิดหรือยัง
    document.cookie = `itpc_actor_id=${parsed!.id}; path=/; SameSite=Lax; max-age=2592000`;
    getSessionCaretaker(parsed!.id)
      .then((fresh) => {
        if (fresh) {
          setCurrentUser(fresh);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          document.cookie = `itpc_actor_id=${fresh.id}; path=/; SameSite=Lax; max-age=2592000`;
        } else {
          localStorage.removeItem(STORAGE_KEY);
          document.cookie = 'itpc_actor_id=; path=/; max-age=0';
        }
      })
      .catch(() => {
        // เชื่อมต่อไม่ได้ → ให้ใช้งานด้วยข้อมูลเดิมไปก่อน (สิทธิ์ admin ยังถูกตรวจซ้ำฝั่ง server)
        setCurrentUser(parsed);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (caretaker: Caretaker) => {
    setCurrentUser(caretaker);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caretaker));
    document.cookie = `itpc_actor_id=${caretaker.id}; path=/; SameSite=Lax; max-age=2592000`;
  };

  const router = useRouter();

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = 'itpc_actor_id=; path=/; max-age=0';
    router.replace('/');
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
