
import { useAuth } from '@/app/services/auth-context';
import { GoogleSignin, isSuccessResponse, User } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



GoogleSignin.configure({
  webClientId: "801122004565-t78a89ko4m5j82dqbkam2feq1kccpchr.apps.googleusercontent.com",
  scopes: ['email', 'profile'],
  offlineAccess: true,
  forceCodeForRefreshToken: true,
  hostedDomain: '',
  accountName: '',
  iosClientId: '801122004565-uqv7spn6omlanheqo7e3n8e8pn30nbdo.apps.googleusercontent.com',
  googleServicePlistPath: '',
  openIdRealm: '',
  profileImageSize: 120,
});


export default function LoginScreen() {
  const [state, setState] = useState<{ userInfo: User | null; isLoading: boolean }>({
    userInfo: null,
    isLoading: false,
  });
  const { setUserEmail } = useAuth();

  const handleGoogleSignin = async () => {
    // Prevent multiple concurrent sign-in attempts
    if (state.isLoading) {
      console.log("Sign-in already in progress, ignoring tap");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const { idToken } = response.data; // This is what your backend needs!
        const userEmail = response.data.user.email;
        const userName = response.data.user.name;

        const BACKEND_URL = "http://192.168.50.203:4000"; // <-- Update this to your backend's local IP and port
        console.log("Attempting to connect to:", BACKEND_URL);

        try {
          const backendResponse = await fetch(`${BACKEND_URL}/api/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          
          const result = await backendResponse.json();

          if (backendResponse.ok) {
            console.log("Authentication successful:", result.user);
            setUserEmail(userEmail);
            setState({ userInfo: response.data, isLoading: false });
            router.push('/(tabs)/Dashboard');
          } else {
            console.error("Backend Auth Failed:", result.error);
            alert(`Auth Error: ${result.error}`);
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        } catch (fetchError) {
          console.error("Network error:", fetchError);
          alert(`Network error: Make sure backend is running on ${BACKEND_URL}`);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Google Signin Error:", error);
      alert(`Google Sign-in Error: ${error}`);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/android-icon-foreground.png')}
          style={styles.illVoiceLogo}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.signInButton}>
          <Button 
            title={state.isLoading ? "Signing in..." : "Sign in with Google"} 
            onPress={handleGoogleSignin}
            disabled={state.isLoading}
          />
        </View>

        <Text style={styles.text}>
          {state.userInfo
            ? `Welcome, ${state.userInfo.user.name}!`
            : 'Please sign in to continue.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  logoContainer: {
    alignItems: 'center',
    marginTop: 80, // safe spacing from top
  },

  illVoiceLogo: {
    width: 128,
    height: 128,
    marginBottom: 32,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  signInButton: {
    width: 192,
    height: 48,
    marginBottom: 16,
  },

  text: {
    fontSize: 14,
    color: '#444',
  },
});

