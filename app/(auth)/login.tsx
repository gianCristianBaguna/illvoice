
import { useAuth } from '@/contexts/auth-context';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

GoogleSignin.configure({
  webClientId: "801122004565-t78a89ko4m5j82dqbkam2feq1kccpchr.apps.googleusercontent.com",
  scopes: ['email', 'profile'],
  offlineAccess: true,
  forceCodeForRefreshToken: true,
  iosClientId: '801122004565-uqv7spn6omlanheqo7e3n8e8pn30nbdo.apps.googleusercontent.com',
  profileImageSize: 120,
});

const BACKEND_URL = "http://192.168.254.111:4000";

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhoneNumber, setSignupPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setUserEmail, setUserName, setUserPhone, setIdToken, setAuthMethod } = useAuth();

  // Google Sign-In Handler
  const handleGoogleSignin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { idToken } = response.data;
        const userEmail = response.data.user.email;
        const userName = response.data.user.name;

        try {
          const backendResponse = await fetch(`${BACKEND_URL}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          
          const result = await backendResponse.json();

          if (backendResponse.ok) {
            console.log("Google authentication successful:", result.user);
            setUserEmail(userEmail);
            setUserName(userName);
            setIdToken(idToken);
            setAuthMethod('GOOGLE');
            router.replace('/(tabs)/Dashboard');
          } else {
            console.log("Google auth failed:", backendResponse.status, result);
            Alert.alert('Error', result.error || 'Google authentication failed');
          }
        } catch (fetchError) {
          Alert.alert('Error', `Network error. Make sure backend is running on ${BACKEND_URL}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', `Google Sign-in failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Username/Password Login Handler
  const handleEmailLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const user = result.user;
        setUserEmail(user.email);
        setUserName(user.name);
        setUserPhone(user.phoneNumber || '');
        setAuthMethod('USERNAME_PASSWORD');
        setLoginEmail('');
        setLoginPassword('');
        router.replace('/(tabs)/Dashboard');
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async () => {
    if (!signupEmail.trim() || !signupPassword.trim() || !signupFullName.trim() || !signupPhoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          fullName: signupFullName,
          phoneNumber: signupPhoneNumber,
          username: signupEmail, // Using email as username
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created! Please log in.');
        setActiveTab('login');
        setLoginEmail(signupEmail);
        setSignupEmail('');
        setSignupPassword('');
        setSignupConfirmPassword('');
        setSignupFullName('');
        setSignupPhoneNumber('');
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', `Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/android-icon-foreground.png')}
            style={styles.illVoiceLogo}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'login' && styles.activeTab]}
            onPress={() => setActiveTab('login')}
          >
            <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
            onPress={() => setActiveTab('signup')}
          >
            <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Tab */}
        {activeTab === 'login' && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Illvoice Account</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={loginEmail}
              onChangeText={setLoginEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={loginPassword}
              onChangeText={setLoginPassword}
              editable={!isLoading}
              secureTextEntry
            />

            <View style={styles.buttonContainer}>
              <Button
                title={isLoading ? "Logging in..." : "Login"}
                onPress={handleEmailLogin}
                disabled={isLoading}
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Or Continue With</Text>

            <View style={styles.buttonContainer}>
              <Button
                title={isLoading ? "Signing in..." : "Sign in with Google"}
                onPress={handleGoogleSignin}
                disabled={isLoading}
                color="#DB4437"
              />
            </View>

            {isLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
          </View>
        )}

        {/* Sign Up Tab */}
        {activeTab === 'signup' && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Create Illvoice Account</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={signupFullName}
              onChangeText={setSignupFullName}
              editable={!isLoading}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={signupEmail}
              onChangeText={setSignupEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              value={signupPhoneNumber}
              onChangeText={setSignupPhoneNumber}
              editable={!isLoading}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password (min 6 characters)"
              value={signupPassword}
              onChangeText={setSignupPassword}
              editable={!isLoading}
              secureTextEntry
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={signupConfirmPassword}
              onChangeText={setSignupConfirmPassword}
              editable={!isLoading}
              secureTextEntry
            />

            <View style={styles.buttonContainer}>
              <Button
                title={isLoading ? "Creating Account..." : "Sign Up"}
                onPress={handleSignUp}
                disabled={isLoading}
              />
            </View>

            {isLoading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },

  illVoiceLogo: {
    width: 100,
    height: 100,
  },

  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginHorizontal: 20,
    marginBottom: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  activeTab: {
    borderBottomColor: '#007AFF',
  },

  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },

  activeTabText: {
    color: '#007AFF',
  },

  content: {
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },

  buttonContainer: {
    marginVertical: 10,
  },

  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },

  loader: {
    marginTop: 20,
  },
});


