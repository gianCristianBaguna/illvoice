'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  adminEmail: string | null;
  adminName: string | null;
  adminToken: string | null;
  adminRole: 'ADMIN' | 'BARANGAY_OFFICIAL' | null;
  barangayId: string | null;
  emailVerified: boolean;
  setEmailVerified: (verified: boolean) => void;
  login: (token: string, email: string, role?: string, barangayId?: string, emailVerified?: boolean) => void;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode the JWT payload (no verification needed for display) to read the user's name.
function decodeJwtName(token: string | null): string | null {
  if (!token || typeof window === 'undefined') return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const data = JSON.parse(json);
    return data.name || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<'ADMIN' | 'BARANGAY_OFFICIAL' | null>(null);
  const [barangayId, setBarangayId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setAdminToken(data.token);
          setAdminEmail(data.email);
          setAdminName(decodeJwtName(data.token));
          setAdminRole((data.role as 'ADMIN' | 'BARANGAY_OFFICIAL') || 'ADMIN');
          setBarangayId(data.barangayId || null);
          setEmailVerified(data.emailVerified ?? false);
          if (typeof window !== 'undefined' && data.token) {
            window.localStorage.setItem('adminToken', data.token);
          }
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

  const login = (token: string, email: string, role?: string, barangayId?: string, emailVerifiedParam?: boolean) => {
    setAdminToken(token);
    setAdminEmail(email);
    setAdminName(decodeJwtName(token));
    setAdminRole((role as 'ADMIN' | 'BARANGAY_OFFICIAL') || 'ADMIN');
    setBarangayId(barangayId || null);
    setEmailVerified(emailVerifiedParam ?? false);
    setIsAuthenticated(true);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('adminToken', token);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => {});

    setAdminToken(null);
    setAdminEmail(null);
    setAdminName(null);
    setAdminRole(null);
    setBarangayId(null);
    setEmailVerified(false);
    setIsAuthenticated(false);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('adminToken');
    }
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
    <AuthContext.Provider value={{ isAuthenticated, adminEmail, adminName, adminToken, adminRole, barangayId, emailVerified, setEmailVerified, login, logout, hasRole, loading }}>
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
