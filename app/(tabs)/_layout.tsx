import { useAuth } from '@/app/services/auth-context';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function DrawerLayout() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    signOut();
    router.replace("/(auth)/login");
  };

  return (
    <Drawer
      drawerContent={(props) => (
        <View style={{ flex: 1 }}>
          {/* Drawer Scrollable Items */}
          <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
          </DrawerContentScrollView>

          {/* Sign Out at bottom */}
          <Pressable
            onPress={handleSignOut}
            style={styles.signOutBtn}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      )}
    >
      {/* Screens */}
    </Drawer>
  );
}

function handleSignOut() {
  router.replace("/(auth)/login");
}

// Styles
const styles = StyleSheet.create({
  drawerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  signOutBtn: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  signOutText: {
    color: "red",
    fontWeight: "600",
    fontSize: 16,
  },
});