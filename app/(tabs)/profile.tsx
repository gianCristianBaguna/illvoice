import { useAuth } from "@/app/services/auth-context";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  credibility: number;
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  image?: string;
}

const BACKEND_URL = "http://192.168.50.203:4000";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { userEmail, userName, signOut } = useAuth();

  useEffect(() => {
    fetchUserProfile();
  }, [userEmail]);

  const fetchUserProfile = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        // Fallback profile
        setProfile({
          id: "unknown",
          email: userEmail,
          name: userName || "Community Member",
          credibility: 1.0,
          totalReports: 0,
          resolvedReports: 0,
          pendingReports: 0,
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const getCredibilityBadge = (credibility: number) => {
    if (credibility >= 1.5) return "★★★ Trusted";
    if (credibility >= 1.2) return "★★ Reliable";
    if (credibility >= 1.0) return "★ Active";
    return "New Member";
  };

  const getCredibilityColor = (credibility: number) => {
    if (credibility >= 1.5) return "#FFD700"; // Gold
    if (credibility >= 1.2) return "#87CEEB"; // Sky blue
    if (credibility >= 1.0) return "#90EE90"; // Light green
    return "#999"; // Gray
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!userEmail) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please log in to view your profile</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      {profile && (
        <>
          {/* Credibility Card */}
          <View style={styles.credibilityCard}>
            <View style={styles.credibilityHeader}>
              <Text style={styles.credibilityLabel}>Community Credibility Score</Text>
              <View style={[styles.credibilityBadge, { backgroundColor: getCredibilityColor(profile.credibility) }]}>
                <Text style={styles.credibilityValue}>{profile.credibility.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.credibilityStatus}>{getCredibilityBadge(profile.credibility)}</Text>
            <Text style={styles.credibilityDesc}>
              Your credibility is calculated based on report accuracy, resolution rate, and community engagement.
            </Text>
          </View>

          {/* Profile Info */}
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
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>Active</Text>
              </View>
            </View>
          </View>

          {/* Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reporting Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.totalReports}</Text>
                <Text style={styles.statLabel}>Total Reports</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.resolvedReports}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{profile.pendingReports}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {profile.totalReports > 0
                    ? `${Math.round((profile.resolvedReports / profile.totalReports) * 100)}%`
                    : "0%"}
                </Text>
                <Text style={styles.statLabel}>Resolution Rate</Text>
              </View>
            </View>
          </View>

          {/* Credibility Factors */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How Credibility Works</Text>
            <View style={styles.factorsList}>
              <View style={styles.factorItem}>
                <Text style={styles.factorIcon}>✓</Text>
                <View style={styles.factorContent}>
                  <Text style={styles.factorTitle}>Accurate Reports</Text>
                  <Text style={styles.factorDesc}>Verified reports increase credibility</Text>
                </View>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorIcon}>✓</Text>
                <View style={styles.factorContent}>
                  <Text style={styles.factorTitle}>Timely Resolution</Text>
                  <Text style={styles.factorDesc}>Quick issue resolution shows engagement</Text>
                </View>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorIcon}>✓</Text>
                <View style={styles.factorContent}>
                  <Text style={styles.factorTitle}>Community Trust</Text>
                  <Text style={styles.factorDesc}>More reports = stronger voice</Text>
                </View>
              </View>
              <View style={styles.factorItem}>
                <Text style={styles.factorIcon}>✓</Text>
                <View style={styles.factorContent}>
                  <Text style={styles.factorTitle}>Detailed Submissions</Text>
                  <Text style={styles.factorDesc}>Multimedia reports boost credibility</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", onPress: () => {} },
                {
                  text: "Sign Out",
                  onPress: () => {
                    signOut();
                  },
                  style: "destructive",
                },
              ]);
            }}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  credibilityCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  credibilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  credibilityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  credibilityBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  credibilityValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  credibilityStatus: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 8,
  },
  credibilityDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    padding: 16,
    paddingBottom: 8,
  },
  infoCard: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  statCard: {
    width: "50%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  factorsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  factorItem: {
    flexDirection: "row",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  factorIcon: {
    fontSize: 18,
    color: "#4CAF50",
    marginRight: 12,
    fontWeight: "bold",
  },
  factorContent: {
    flex: 1,
  },
  factorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  factorDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ff3b30",
    borderRadius: 8,
    alignItems: "center",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
