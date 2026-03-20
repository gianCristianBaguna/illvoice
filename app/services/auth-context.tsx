import React, { createContext, ReactNode, useContext, useState } from 'react';

interface AuthContextType {
  userEmail: string | null;
  userName: string | null;
  setUserEmail: (email: string) => void;
  setUserName: (name: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const signOut = () => {
    setUserEmail(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ userEmail, userName, setUserEmail, setUserName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
