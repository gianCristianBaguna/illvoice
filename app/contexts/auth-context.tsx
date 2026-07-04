import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isLoading: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  phoneNumber: string | null;
  idToken: string | null;
  authMethod: string | null;
  setUserEmail: (email: string) => void;
  setUserName: (name: string) => void;
  setUserPhoto: (photo: string | null) => void;
  setUserPhone: (phone: string | null) => void;
  setIdToken: (token: string) => void;
  setAuthMethod: (method: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [phoneNumber, setUserPhone] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('idToken');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        const storedName = await AsyncStorage.getItem('userName');
        const storedPhoto = await AsyncStorage.getItem('userPhoto');
        const storedPhone = await AsyncStorage.getItem('phoneNumber');
        const storedMethod = await AsyncStorage.getItem('authMethod');

        if (storedToken && storedEmail) {
          setIsSignedIn(true);
          setIdToken(storedToken);
          setUserEmail(storedEmail);
          setUserName(storedName);
          setUserPhoto(storedPhoto);
          setUserPhone(storedPhone);
          setAuthMethod(storedMethod);
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
      ]);
    } catch (e) {
      console.error('Failed to clear auth state:', e);
    } finally {
      setIsSignedIn(false);
      setIdToken(null);
      setUserEmail(null);
      setUserName(null);
      setUserPhoto(null);
      setUserPhone(null);
      setAuthMethod(null);
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
        phoneNumber,
        idToken,
        authMethod,
        setUserEmail,
        setUserName,
        setUserPhoto,
        setUserPhone,
        setIdToken,
        setAuthMethod,
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
