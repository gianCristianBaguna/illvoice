import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
  idToken: string | null;
  authMethod: 'GOOGLE' | 'USERNAME_PASSWORD' | null;
  isLoading: boolean;
  isSignedIn: boolean;
  setUserEmail: (email: string) => void;
  setUserName: (name: string) => void;
  setUserPhone: (phone: string) => void;
  setIdToken: (token: string) => void;
  setAuthMethod: (method: 'GOOGLE' | 'USERNAME_PASSWORD') => void;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'GOOGLE' | 'USERNAME_PASSWORD' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token on app startup
  useEffect(() => {
    restoreToken();
  }, []);

  const restoreToken = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedName = await AsyncStorage.getItem('userName');
      const storedPhone = await AsyncStorage.getItem('userPhone');
      const storedToken = await AsyncStorage.getItem('idToken');
      const storedMethod = (await AsyncStorage.getItem('authMethod')) as 'GOOGLE' | 'USERNAME_PASSWORD' | null;

      if (storedEmail && storedName) {
        setUserEmail(storedEmail);
        setUserName(storedName);
        storedPhone && setUserPhone(storedPhone);
        storedToken && setIdToken(storedToken);
        storedMethod && setAuthMethod(storedMethod);
      }
    } catch (e) {
      console.error('Failed to restore token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetUserEmail = (email: string) => {
    setUserEmail(email);
    AsyncStorage.setItem('userEmail', email).catch(e => console.error('Failed to save email:', e));
  };

  const handleSetUserName = (name: string) => {
    setUserName(name);
    AsyncStorage.setItem('userName', name).catch(e => console.error('Failed to save name:', e));
  };

  const handleSetUserPhone = (phone: string) => {
    setUserPhone(phone);
    AsyncStorage.setItem('userPhone', phone).catch(e => console.error('Failed to save phone:', e));
  };

  const handleSetIdToken = (token: string) => {
    setIdToken(token);
    AsyncStorage.setItem('idToken', token).catch(e => console.error('Failed to save token:', e));
  };

  const handleSetAuthMethod = (method: 'GOOGLE' | 'USERNAME_PASSWORD') => {
    setAuthMethod(method);
    AsyncStorage.setItem('authMethod', method).catch(e => console.error('Failed to save auth method:', e));
  };

  const signOut = async () => {
    setUserEmail(null);
    setUserName(null);
    setUserPhone(null);
    setIdToken(null);
    setAuthMethod(null);
    try {
      await AsyncStorage.multiRemove(['userEmail', 'userName', 'userPhone', 'idToken', 'authMethod']);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  };

  const isSignedIn = !!userEmail;

  return (
    <AuthContext.Provider 
      value={{ 
        userEmail, 
        userName,
        userPhone,
        idToken,
        authMethod,
        isLoading,
        isSignedIn,
        setUserEmail: handleSetUserEmail, 
        setUserName: handleSetUserName,
        setUserPhone: handleSetUserPhone,
        setIdToken: handleSetIdToken,
        setAuthMethod: handleSetAuthMethod,
        signOut,
        restoreToken,
      }}
    >
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
