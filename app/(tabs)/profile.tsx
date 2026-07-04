import { useAuth } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  credibility: number;
  totalReports: number;
  resolvedReports: number;
  credibleReports: number;
  pendingReports: number;
  image?: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userEmail, userName, userPhoto, idToken, signOut } = useAuth();

  const fetchUserProfile = useCallback(async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setProfile({
          id: "unknown",
          email: userEmail,
          name: userName || "Community Member",
          credibility: 0,
          totalReports: 0,
          resolvedReports: 0,
          credibleReports: 0,
          pendingReports: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userEmail, userName, idToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserProfile();
    setRefreshing(false);
  }, [fetchUserProfile]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const getCredibilityLabel = (credibility: number) => {
    if (credibility >= 90) return "Credible";
    if (credibility >= 50) return "Unverified";
    return "Low Credibility";
  };

  const getCredibilityColor = (credibility: number) => {
    if (credibility >= 90) return "#FFD700";
    if (credibility >= 50) return "#FF9500";
    return "#FF3B30";
  };

  const getCredibilityIcon = (credibility: number) => {
    if (credibility >= 90) return "shield-checkmark";
    if (credibility >= 50) return "shield-half";
    return "shield";
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Sign Out",
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
        style: "destructive",
      },
    ]);
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

  if (!userEmail) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color="#c7c7cc" />
          <Text style={styles.emptyText}>Please log in to view your profile</Text>
          <TouchableOpacity style={styles.loginPromptButton} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginPromptText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerContainer}>
        <View style={[styles.headerView, { backgroundColor: '#1E3A8A' }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>My Profile</Text>
              <Text style={styles.userNameText}>{profile?.name || "User"}</Text>
            </View>
            <View style={styles.avatarContainer}>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.userAvatar} />
              ) : (
                <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {profile && (
        <>
          <View style={styles.credibilityContainer}>
            <View style={styles.credibilityCard}>
              <View style={styles.credibilityHeader}>
                <Text style={styles.credibilityLabel}>Credibility Score</Text>
                <View style={[styles.credibilityBadge, { backgroundColor: getCredibilityColor(profile.credibility) }]}>
                  <Ionicons name={getCredibilityIcon(profile.credibility)} size={28} color="#fff" />
                </View>
              </View>
              <Text style={styles.credibilityPercentage}>{profile.credibility}%</Text>
              <Text style={[styles.credibilityStatus, { color: getCredibilityColor(profile.credibility) }]}>
                {getCredibilityLabel(profile.credibility)}
              </Text>
              <Text style={styles.credibilityDesc}>
                Based on {profile.credibleReports} credible out of {profile.resolvedReports} resolved reports
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="document-text" size={24} color="#1E3A8A" />
                <Text style={styles.statValue}>{profile.totalReports}</Text>
                <Text style={styles.statLabel}>Total Reports</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#34c759" />
                <Text style={styles.statValue}>{profile.resolvedReports}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="shield" size={24} color={getCredibilityColor(profile.credibility)} />
                <Text style={styles.statValue}>{profile.credibleReports}</Text>
                <Text style={styles.statLabel}>Credible</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#ff9500" />
                <Text style={styles.statValue}>{profile.pendingReports}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{profile.name || "Not set"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Status</Text>
                <Text style={styles.infoValue}>Active</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credibility Levels</Text>
            <View style={styles.levelsList}>
              <View style={styles.levelItem}>
                <View style={[styles.levelDot, { backgroundColor: '#FFD700' }]} />
                <View style={styles.levelContent}>
                  <Text style={styles.levelTitle}>Credible (90%+)</Text>
                  <Text style={styles.levelDesc}>Admin verified as trustworthy reporter</Text>
                </View>
              </View>
              <View style={styles.levelItem}>
                <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
                <View style={styles.levelContent}>
                  <Text style={styles.levelTitle}>Unverified (50-90%)</Text>
                  <Text style={styles.levelDesc}>Some reports need verification</Text>
                </View>
              </View>
              <View style={styles.levelItem}>
                <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
                <View style={styles.levelContent}>
                  <Text style={styles.levelTitle}>Low Credibility (&lt;50%)</Text>
                  <Text style={styles.levelDesc}>Needs improvement on report quality</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
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
    paddingBottom: 32,
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
  userNameText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
  },
  avatarContainer: {
    position: 'relative',
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  credibilityContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  credibilityCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    alignItems: 'center',
  },
  credibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  credibilityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  credibilityBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  credibilityPercentage: {
    fontSize: 48,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  credibilityStatus: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  credibilityDesc: {
    fontSize: 13,
    color: "#8e8e93",
    textAlign: 'center',
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    gap: 12,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  statLabel: {
    fontSize: 12,
    color: "#8e8e93",
    fontWeight: "500",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#8e8e93",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1a1a2e",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f5",
  },
  levelsList: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    gap: 12,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  levelContent: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  levelDesc: {
    fontSize: 12,
    color: "#8e8e93",
    marginTop: 2,
  },
  signOutButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#1E3A8A",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  loginPromptButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  loginPromptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});