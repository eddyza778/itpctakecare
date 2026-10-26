'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Caretaker } from '@/lib/types';

interface AuthContextType {
  currentUser: Caretaker | null;
  login: (caretaker: Caretaker) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Caretaker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('itpc_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('itpc_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (caretaker: Caretaker) => {
    setCurrentUser(caretaker);
    localStorage.setItem('itpc_user', JSON.stringify(caretaker));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('itpc_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
