import { useAuth, decodeJwtRole } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setUserEmail, setUserName, setUserPhone, setIdToken, setUserRole, setAuthMethod, setEmailVerified } = useAuth();

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim() || !phoneNumber.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phoneNumber,
          username: email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const loginResult = await loginResponse.json();

        if (loginResponse.ok && loginResult.token) {
          setUserEmail(loginResult.user.email);
          setUserName(loginResult.user.name);
          setUserPhone(loginResult.user.phoneNumber || null);
          setIdToken(loginResult.token);
          setUserRole(decodeJwtRole(loginResult.token));
          setAuthMethod('USERNAME_PASSWORD');
          setEmailVerified(loginResult.user.emailVerified || false);
          await AsyncStorage.multiSet([
            ['idToken', loginResult.token],
            ['userEmail', loginResult.user.email],
            ['userName', loginResult.user.name || ''],
            ['userRole', loginResult.user.role || ''],
            ['phoneNumber', loginResult.user.phoneNumber || ''],
            ['authMethod', 'USERNAME_PASSWORD'],
            ['emailVerified', String(loginResult.user.emailVerified || false)],
          ]);
          if (loginResult.user.emailVerified) {
            router.replace('/(tabs)/Dashboard');
          } else {
            router.replace('/(auth)/verify-email');
          }
        } else {
          Alert.alert('Success', 'Account created! Please log in.');
          router.replace('/(auth)/login');
        }
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Network error: ${errorMessage}\n\nBackend: ${BACKEND_URL}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/LoginLogo.png')}
          />
        </View>
        <Text style={styles.sectionTitle}>Register your account</Text>

        <View style={styles.content}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            editable={!isLoading}
          />

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

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            editable={!isLoading}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Create a password (min 6 characters)"
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

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeButtonText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? "Creating Account..." : "Sign Up"}
              onPress={handleSignUp}
              disabled={isLoading}
              color="#1E3A8A"
            />
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  backButton: {
    padding: 8,
  },

  backButtonText: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 30,
    color: '#1E3A8A',
    paddingHorizontal: 20,
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
  },

  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  eyeButtonText: {
    fontSize: 18,
  },

  buttonContainer: {
    marginVertical: 10,
    borderRadius: 20,
  },

  loader: {
    marginTop: 20,
  },
});