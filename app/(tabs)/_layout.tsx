import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Pressable, Text, View } from 'react-native';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => (
        <View style={{ flex: 1 }}>
          {/* Default items */}
          <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
          </DrawerContentScrollView>

          {/* SIGN OUT */}
          <Pressable
            onPress={handleSignOut}
            style={{ padding: 16, borderTopWidth: 1 }}
          >
            <Text style={{ color: 'red', fontWeight: '600' }}>
              Sign Out na yarn
            </Text>
          </Pressable>
        </View>
      )}
    >
      <Drawer.Screen name="index" options={{ title: 'Home' }} />
      <Drawer.Screen name="explore" options={{ title: 'Explore' }} />
    </Drawer>
  );
}

function handleSignOut() {
  router.replace('/(auth)/login');
}
