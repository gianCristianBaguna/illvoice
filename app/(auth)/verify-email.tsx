import { useAuth } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const { userEmail, idToken, setEmailVerified } = useAuth();

  const handleVerify = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-email/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ code }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        Alert.alert('Error', 'Server returned an unexpected response. Please try again.');
        return;
      }

      if (response.ok) {
        setEmailVerified(true);
        await AsyncStorage.multiSet([
          ['emailVerified', 'true'],
        ]);
        Alert.alert('Success', 'Your email has been verified successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/Dashboard') },
        ]);
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Network error: ${errorMessage}\n\nBackend: ${BACKEND_URL}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setDevCode(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-email/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });

      let result;
      try {
        result = await response.json();
      } catch {
        Alert.alert('Error', 'Server returned an unexpected response. Please try again.');
        return;
      }

      if (response.ok) {
        if (result.code) {
          setDevCode(result.code);
          Alert.alert('Dev Mode', `Your verification code is: ${result.code}`);
        } else {
          Alert.alert('Success', 'Verification code has been resent to your email');
        }
       } else {
        if (result.error === 'Email is already verified') {
          setEmailVerified(true);
          try {
            await AsyncStorage.multiSet([
              ['emailVerified', 'true'],
            ]);
            await AsyncStorage.removeItem('skippedVerification');
          } catch {
            // no-op
          }
          router.replace('/(tabs)/Dashboard');
        } else {
          Alert.alert('Error', result.error || 'Failed to resend code');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Network error: ${errorMessage}\n\nBackend: ${BACKEND_URL}`);
    } finally {
      setIsResending(false);
    }
  };

  const handleSendCode = async () => {
    setIsResending(true);
    setDevCode(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-email/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });

      let result;
      try {
        result = await response.json();
      } catch {
        Alert.alert('Error', 'Server returned an unexpected response. Please try again.');
        return;
      }

      if (response.ok) {
        if (result.code) {
          setDevCode(result.code);
          Alert.alert('Dev Mode', `Your verification code is: ${result.code}`);
        } else {
          Alert.alert('Success', 'Verification code sent to your email');
        }
       } else {
        if (result.error === 'Email is already verified') {
          setEmailVerified(true);
          try {
            await AsyncStorage.multiSet([
              ['emailVerified', 'true'],
            ]);
            await AsyncStorage.removeItem('skippedVerification');
          } catch {
            // no-op
          }
          router.replace('/(tabs)/Dashboard');
        } else {
          Alert.alert('Error', result.error || 'Failed to send verification code');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Error', `Network error: ${errorMessage}\n\nBackend: ${BACKEND_URL}`);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={64} color="#1E3A8A" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to{'\n'}
          {userEmail || 'your email address'}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (!code || code.length !== 6 || isLoading) && styles.disabledButton]}
          onPress={handleVerify}
          disabled={!code || code.length !== 6 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={isResending}>
            <Text style={styles.resendLink}>
              {isResending ? 'Resending...' : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.proceedLaterContainer}
          onPress={async () => {
            try {
              await AsyncStorage.setItem('skippedVerification', 'true');
            } catch {
              // no-op
            }
            router.replace('/(tabs)/Dashboard');
          }}
        >
          <Text style={styles.proceedLaterLink}>Proceed and verify later</Text>
        </TouchableOpacity>

        {devCode && (
          <View style={styles.devNotice}>
            <Text style={styles.devNoticeText}>Dev code: {devCode}</Text>
            <Text style={styles.devNoticeSub}>Email sending not configured in this environment</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8eaf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1a1a2e',
  },
  verifyButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#c7c7cc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  resendLink: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  devNotice: {
    marginTop: 24,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  devNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
  },
  devNoticeSub: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    marginTop: 4,
  },
  proceedLaterContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  proceedLaterLink: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
});
