'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  adminEmail: string | null;
  adminToken: string | null;
  adminRole: 'ADMIN' | 'BARANGAY_OFFICIAL' | null;
  login: (token: string, email: string, role?: string) => void;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<'ADMIN' | 'BARANGAY_OFFICIAL' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setAdminToken(data.token);
          setAdminEmail(data.email);
          setAdminRole((data.role as 'ADMIN' | 'BARANGAY_OFFICIAL') || 'ADMIN');
          setIsAuthenticated(true);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token: string, email: string, role?: string) => {
    setAdminToken(token);
    setAdminEmail(email);
    setAdminRole((role as 'ADMIN' | 'BARANGAY_OFFICIAL') || 'ADMIN');
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => {});

    setAdminToken(null);
    setAdminEmail(null);
    setAdminRole(null);
    setIsAuthenticated(false);
  };

  const hasRole = (roles: string[]) => {
    if (!adminRole) return false;
    return roles.includes(adminRole);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, adminEmail, adminToken, adminRole, login, logout, hasRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
