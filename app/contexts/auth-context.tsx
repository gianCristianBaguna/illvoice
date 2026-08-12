import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '@/config';
import { router } from 'expo-router';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isLoading: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  userRole: string | null;
  phoneNumber: string | null;
  idToken: string | null;
  authMethod: string | null;
  emailVerified: boolean;
  setEmailVerified: (verified: boolean) => void;
  setUserEmail: (email: string) => void;
  setUserName: (name: string) => void;
  setUserPhoto: (photo: string | null) => void;
  setUserRole: (role: string | null) => void;
  setUserPhone: (phone: string | null) => void;
  setIdToken: (token: string) => void;
  setAuthMethod: (method: string) => void;
  setIsSignedIn: (signedIn: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function decodeJwtRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const data = JSON.parse(json);
    return data.role || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [phoneNumber, setUserPhone] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('idToken');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        const storedName = await AsyncStorage.getItem('userName');
        const storedPhoto = await AsyncStorage.getItem('userPhoto');
        const storedPhone = await AsyncStorage.getItem('phoneNumber');
        const storedMethod = await AsyncStorage.getItem('authMethod');
        const storedVerified = await AsyncStorage.getItem('emailVerified');

        if (storedToken && storedEmail) {
          setIsSignedIn(true);
          setIdToken(storedToken);
          setUserEmail(storedEmail);
          setUserName(storedName);
          setUserPhoto(storedPhoto);
          setUserPhone(storedPhone);
          setUserRole(decodeJwtRole(storedToken));
          setAuthMethod(storedMethod);

          let isVerified = storedVerified === 'true';
          try {
            const statusResponse = await fetch(`${BACKEND_URL}/api/auth/verify-email/status`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              isVerified = statusData.emailVerified === true;
              await AsyncStorage.setItem('emailVerified', String(isVerified));
            }
          } catch (statusErr) {
            console.error('Failed to sync verification status:', statusErr);
          }
          setEmailVerified(isVerified);
        }
      } catch (e) {
        console.error('Failed to restore auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove([
        'idToken',
        'userEmail',
        'userName',
        'userPhoto',
        'phoneNumber',
        'authMethod',
        'emailVerified',
      ]);
    } catch (e) {
      console.error('Failed to clear auth state:', e);
    } finally {
      setIsSignedIn(false);
      setIdToken(null);
      setUserEmail(null);
      setUserName(null);
      setUserPhoto(null);
      setUserRole(null);
      setUserPhone(null);
      setAuthMethod(null);
      setEmailVerified(false);
      router.replace('/(auth)/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isSignedIn,
        userEmail,
        userName,
        userPhoto,
        userRole,
        phoneNumber,
        idToken,
        authMethod,
        emailVerified,
        setEmailVerified,
        setUserEmail,
        setUserName,
        setUserPhoto,
        setUserRole,
        setUserPhone,
        setIdToken,
        setAuthMethod,
        setIsSignedIn,
        signOut,
      }}
    >
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
