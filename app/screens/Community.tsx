import { useAuth } from '@/contexts/auth-context';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function CommunityScreen() {
  const { idToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
      const response = await fetch(`${BACKEND_URL}/api/announcements/announcements`, {
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch announcements: ${response.status}`);
      }
      const data = await response.json();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [idToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncements();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#ff3b30';
      case 'HIGH':
        return '#ff9500';
      case 'LOW':
        return '#34c759';
      default:
        return '#1E3A8A';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'alert-circle';
      case 'HIGH':
        return 'warning';
      case 'LOW':
        return 'information-circle';
      default:
        return 'megaphone';
    }
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => {
    const priorityColor = getPriorityColor(item.priority);
    const priorityIcon = getPriorityIcon(item.priority);
    return (
      <View style={styles.announcementCard}>
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
        <View style={styles.announcementContent}>
          <View style={styles.announcementHeader}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '15' }]}>
              <Ionicons name={priorityIcon as any} size={14} color={priorityColor} />
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {item.priority}
              </Text>
            </View>
            <Text style={styles.announcementDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
          <Text style={styles.announcementTitle}>{item.title}</Text>
          <Text style={styles.announcementText}>{item.content}</Text>
          {item.createdBy && (
            <Text style={styles.announcementAuthor}>
              Posted by {item.createdBy.name || item.createdBy.email}
            </Text>
          )}
        </View>
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
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>Community</Text>
              <Text style={styles.headerSubtitle}>Announcements and updates</Text>
            </View>
            <View style={styles.headerIconContainer}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
          </View>
        </View>
      </View>

      {announcements.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="megaphone-outline" size={48} color="#c7c7cc" />
          <Text style={styles.emptyText}>No announcements yet</Text>
          <Text style={styles.emptySubtext}>Check back later for community updates</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
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
  announcementCard: {
    flexDirection: 'row',
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    overflow: 'hidden',
  },
  priorityIndicator: {
    width: 4,
  },
  announcementContent: {
    flex: 1,
    padding: 16,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  announcementDate: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  announcementText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  announcementAuthor: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
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
