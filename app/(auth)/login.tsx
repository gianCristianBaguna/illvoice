import { useAuth } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setUserEmail, setUserName, setUserPhoto, setUserPhone, setIdToken, setAuthMethod, setEmailVerified } = useAuth();

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
        const userPhoto = response.data.user.photo;

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
            userPhoto && setUserPhoto(userPhoto);
            setIdToken(result.token);
            setAuthMethod('GOOGLE');
            setEmailVerified(result.user?.emailVerified || false);
            await AsyncStorage.multiSet([
              ['idToken', result.token],
              ['userEmail', userEmail],
              ['userName', userName || ''],
              ['userPhoto', userPhoto || ''],
              ['authMethod', 'GOOGLE'],
              ['emailVerified', String(result.user?.emailVerified || false)],
            ]);
            if (result.user?.emailVerified) {
              router.replace('/(tabs)/Dashboard');
            } else {
              router.replace('/(auth)/verify-email');
            }
          } else {
            console.log("Google auth failed:", backendResponse.status, result);
            Alert.alert('Error', result.error || 'Google authentication failed');
          }
        } catch (error) {
          Alert.alert('Error', `Network error. Make sure backend is running on ${BACKEND_URL}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', `Google Sign-in failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result = await response.json();

        if (response.ok) {
          if (result.token) {
            setUserEmail(result.user.email);
            setUserName(result.user.name);
            setUserPhone(result.user.phoneNumber || null);
            setIdToken(result.token);
            setAuthMethod('USERNAME_PASSWORD');
            setEmailVerified(result.user.emailVerified || false);
            await AsyncStorage.multiSet([
              ['idToken', result.token],
              ['userEmail', result.user.email],
              ['userName', result.user.name || ''],
              ['phoneNumber', result.user.phoneNumber || ''],
              ['authMethod', 'USERNAME_PASSWORD'],
              ['emailVerified', String(result.user.emailVerified || false)],
            ]);
            setEmail('');
            setPassword('');
            if (result.user.emailVerified) {
              router.replace('/(tabs)/Dashboard');
            } else {
              router.replace('/(auth)/verify-email');
            }
          } else {
          Alert.alert('Error', 'No authentication token received');
        }
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
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
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/LoginLogo.png')}
          />
        </View>
        <Text style={styles.sectionTitle}>Login to Your Account</Text>

        <View style={styles.content}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Pressable
              onPress={handleEmailLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && { opacity: 0.8 },
                isLoading && { opacity: 0.6 },
              ]}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                {isLoading ? "Logging in..." : "Login"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.signupContainer}>
            <Text style={styles.label}>Or</Text>
          </View>

          <View style={styles.signinGoogleContainer}>
            <TouchableOpacity
              onPress={handleGoogleSignin}
              disabled={isLoading}
              style={styles.googleButton}
            >
              <Text style={styles.googleButtonText}>
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {isLoading && <ActivityIndicator size="large" color="#1E3A8A" style={styles.loader} />}
        </View>
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
    marginTop: 100,
    marginBottom: 90,
  },

  illVoiceLogo: {
    width: 200,
    height: 200,
  },

  content: {
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'System',
    marginBottom: 20,
    color: '#1E3A8A',
    paddingHorizontal: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7b7b7b',
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

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 12,
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#010101'
  },

  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  eyeButtonText: {
    fontSize: 18,
  },

  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#1E3A8A',
  },

  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  rememberMeText: {
    fontSize: 14,
    color: '#555',
  },
  
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },

  loader: {
    marginTop: 20,
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
  },

  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  signupText: {
    fontSize: 14,
    color: '#666',
  },

  signupLink: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },

  signinGoogleContainer: {
    marginVertical: 10,
    borderRadius: 9,
    borderWidth: 0.5,
  },

});
