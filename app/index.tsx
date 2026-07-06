import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/auth-context";

export default function Index() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) return null;

  if (isSignedIn) {
    return <Redirect href="/(tabs)/Dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
