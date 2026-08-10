import { BACKEND_URL } from '@/config';
import { router } from 'expo-router';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface EmergencyNumber {
  id: string;
  category: string;
  number: string;
  label?: string;
  isActive: boolean;
}

export default function EmergencyScreen() {
  const [numbers, setNumbers] = useState<EmergencyNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmergencyNumbers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/emergency-numbers/emergency-numbers`);
      if (!response.ok) {
        throw new Error(`Failed to fetch emergency numbers: ${response.status}`);
      }
      const data = await response.json();
      setNumbers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching emergency numbers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmergencyNumbers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmergencyNumbers();
  };

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('police')) return 'shield';
    if (lower.includes('fire')) return 'flame';
    if (lower.includes('medical') || lower.includes('hospital')) return 'medkit';
    if (lower.includes('barangay')) return 'home';
    if (lower.includes('rescue')) return 'airplane';
    return 'call';
  };

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('police')) return '#1E3A8A';
    if (lower.includes('fire')) return '#ff3b30';
    if (lower.includes('medical') || lower.includes('hospital')) return '#34c759';
    if (lower.includes('barangay')) return '#ff9500';
    return '#666';
  };

  const handleCall = (number: string) => {
    router.push({ pathname: 'tel:' as any, params: { number } } as any);
  };

  const renderItem = ({ item }: { item: EmergencyNumber }) => {
    const categoryColor = getCategoryColor(item.category);
    const categoryIcon = getCategoryIcon(item.category);
    return (
      <View style={styles.emergencyCard}>
        <View style={[styles.emergencyIconContainer, { backgroundColor: categoryColor + '15' }]}>
          <Ionicons name={categoryIcon as any} size={28} color={categoryColor} />
        </View>
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyCategory}>{item.category}</Text>
          {item.label && <Text style={styles.emergencyLabel}>{item.label}</Text>}
          <Text style={styles.emergencyNumber}>{item.number}</Text>
        </View>
        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: categoryColor }]}
          onPress={() => handleCall(item.number)}
        >
          <Ionicons name="call" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingView, { backgroundColor: '#1E3A8A' }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={[styles.headerView, { backgroundColor: '#1E3A8A' }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>Emergency</Text>
              <Text style={styles.headerSubtitle}>Important contact numbers</Text>
            </View>
            <View style={styles.headerIconContainer}>
              <Ionicons name="call" size={24} color="#fff" />
            </View>
          </View>
        </View>
      </View>

      {numbers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="call-outline" size={48} color="#c7c7cc" />
          <Text style={styles.emptyText}>No emergency numbers</Text>
          <Text style={styles.emptySubtext}>Contact numbers will appear here when added by admin</Text>
        </View>
      ) : (
        <FlatList
          data={numbers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  loadingContainer: {
    flex: 1,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerView: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "400",
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    gap: 14,
  },
  emergencyIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  emergencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  emergencyNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
});
