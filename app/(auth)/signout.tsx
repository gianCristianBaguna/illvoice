import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';

export default function SignOutScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Sign Out</Text>
      <Button title="Go to Login" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
}