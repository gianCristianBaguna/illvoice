import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  userPhone: string | null;
  idToken: string | null;
  authMethod: 'GOOGLE' | 'USERNAME_PASSWORD' | null;
  emailVerified: boolean;
  isLoading: boolean;
  isSignedIn: boolean;
  setUserEmail: (email: string) => void;
  setUserName: (name: string) => void;
  setUserPhoto: (photo: string | null) => void;
  setUserPhone: (phone: string | null) => void;
  setIdToken: (token: string | null) => void;
  setAuthMethod: (method: 'GOOGLE' | 'USERNAME_PASSWORD') => void;
  setEmailVerified: (verified: boolean) => void;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'GOOGLE' | 'USERNAME_PASSWORD' | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token on app startup
  useEffect(() => {
    restoreToken();
  }, []);

  const restoreToken = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedName = await AsyncStorage.getItem('userName');
      const storedPhoto = await AsyncStorage.getItem('userPhoto');
      const storedPhone = await AsyncStorage.getItem('userPhone');
      const storedToken = await AsyncStorage.getItem('idToken');
const storedMethod = (await AsyncStorage.getItem('authMethod')) as 'GOOGLE' | 'USERNAME_PASSWORD' | null;
        const storedVerified = await AsyncStorage.getItem('emailVerified');

        if (storedEmail && storedName) {
          setUserEmail(storedEmail);
          setUserName(storedName);
          storedPhoto && setUserPhoto(storedPhoto);
          storedPhone && setUserPhone(storedPhone);
          storedToken && setIdToken(storedToken);
          storedMethod && setAuthMethod(storedMethod);
          setEmailVerified(storedVerified === 'true');
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

  const handleSetUserPhoto = (photo: string | null) => {
    setUserPhoto(photo);
    if (photo) {
      AsyncStorage.setItem('userPhoto', photo).catch(e => console.error('Failed to save photo:', e));
    } else {
      AsyncStorage.removeItem('userPhoto').catch(e => console.error('Failed to remove photo:', e));
    }
  };

  const handleSetUserPhone = (phone: string | null) => {
    setUserPhone(phone);
    if (phone) {
      AsyncStorage.setItem('userPhone', phone).catch(e => console.error('Failed to save phone:', e));
    } else {
      AsyncStorage.removeItem('userPhone').catch(e => console.error('Failed to remove phone:', e));
    }
  };

  const handleSetIdToken = (token: string | null) => {
    setIdToken(token);
    if (token) {
      AsyncStorage.setItem('idToken', token).catch(e => console.error('Failed to save token:', e));
    } else {
      AsyncStorage.removeItem('idToken').catch(e => console.error('Failed to remove token:', e));
    }
  };

  const handleSetAuthMethod = (method: 'GOOGLE' | 'USERNAME_PASSWORD') => {
    setAuthMethod(method);
    AsyncStorage.setItem('authMethod', method).catch(e => console.error('Failed to save auth method:', e));
  };

  const handleSetEmailVerified = (verified: boolean) => {
    setEmailVerified(verified);
    AsyncStorage.setItem('emailVerified', String(verified)).catch(e => console.error('Failed to save email verified:', e));
  };

  const signOut = async () => {
    setUserEmail(null);
    setUserName(null);
    setUserPhoto(null);
    setUserPhone(null);
    setIdToken(null);
    setAuthMethod(null);
    setEmailVerified(false);
    try {
      await AsyncStorage.multiRemove(['userEmail', 'userName', 'userPhoto', 'userPhone', 'idToken', 'authMethod', 'emailVerified']);
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
         userPhoto,
         userPhone,
         idToken,
         authMethod,
         emailVerified,
         isLoading,
         isSignedIn,
         setUserEmail: handleSetUserEmail, 
         setUserName: handleSetUserName,
         setUserPhoto: handleSetUserPhoto,
         setUserPhone: handleSetUserPhone,
         setIdToken: handleSetIdToken,
         setAuthMethod: handleSetAuthMethod,
         setEmailVerified: handleSetEmailVerified,
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
