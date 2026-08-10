import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ReportRefreshProvider } from '@/contexts/report-refresh-context';

export default function TabLayout() {
  return (
    <ReportRefreshProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8e8e93',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#e5e5ea',
          },
        }}
      >
        <Tabs.Screen
          name="Dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="Alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="Community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />
      </Tabs>
    </ReportRefreshProvider>
  );
}