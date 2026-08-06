import { Redirect, router } from "expo-router";
import { useAuth } from "@/contexts/auth-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const { isLoading, isSignedIn, emailVerified } = useAuth();
  const [showGate, setShowGate] = useState(false);
  const [checkingSkip, setCheckingSkip] = useState(true);

  useEffect(() => {
    const checkSkip = async () => {
      if (!isSignedIn || emailVerified) {
        setCheckingSkip(false);
        return;
      }
      try {
        const skipped = await AsyncStorage.getItem("skippedVerification");
        setShowGate(skipped !== "true");
      } catch {
        setShowGate(true);
      } finally {
        setCheckingSkip(false);
      }
    };

    checkSkip();
  }, [isSignedIn, emailVerified]);

  if (isLoading || checkingSkip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  if (emailVerified) {
    return <Redirect href="/(tabs)/Dashboard" />;
  }

  if (showGate) {
    const handleVerifyNow = async () => {
      try {
        await AsyncStorage.removeItem("skippedVerification");
      } catch {
        // no-op
      }
      router.replace("/(auth)/verify-email");
    };

    const handleProceed = async () => {
      try {
        await AsyncStorage.setItem("skippedVerification", "true");
      } catch {
        // no-op
      }
      router.replace("/(tabs)/Dashboard");
    };

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={72} color="#1E3A8A" />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            Please verify your email to unlock the full app experience.
            You can also proceed and verify later.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleVerifyNow}
          >
            <Text style={styles.primaryButtonText}>Verify Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleProceed}
          >
            <Text style={styles.secondaryButtonText}>Proceed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <Redirect href="/(tabs)/Dashboard" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
  },
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: "#e8eaf6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#1E3A8A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  secondaryButtonText: {
    color: "#1E3A8A",
    fontSize: 16,
    fontWeight: "600",
  },
});
