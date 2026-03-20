import { useAuth } from "@/app/services/auth-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

interface Report {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MODERATE" | "HIGH";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  latitude?: number;
  longitude?: number;
  multimedia?: { type: string; url: string }[];
}

const BACKEND_URL = "http://192.168.50.203:4000";

interface DashboardStats {
  totalReports: number;
  resolvedCount: number;
  pendingCount: number;
  credibility: number;
}

export default function Dashboard() {
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const { userEmail } = useAuth();
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"TEXT" | "IMAGE" | "VIDEO" | "AUDIO">("TEXT");
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    resolvedCount: 0,
    pendingCount: 0,
    credibility: 1.0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLocation();
    fetchDashboardData();
  }, [userEmail]);

  const getLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission", "Location access is required for reporting");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      console.error("Location error:", err);
    }
  };

  const fetchDashboardData = async () => {
    if (!userEmail) return;

    try {
      setLoading(true);

      // Fetch user reports
      const reportsResponse = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        headers: { "X-User-Email": userEmail },
      });

      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
        setUserReports(reports);

        // Calculate stats
        const resolved = reports.filter((r: Report) => r.status === "RESOLVED").length;
        const pending = reports.filter((r: Report) => r.status === "PENDING").length;
        setStats({
          totalReports: reports.length,
          resolvedCount: resolved,
          pendingCount: pending,
          credibility: 1.0 + (resolved * 0.1), // Credibility increases with resolved reports
        });
      }

      // Fetch all reports for nearby view
      const allReportsResponse = await fetch(`${BACKEND_URL}/api/reports`);
      if (allReportsResponse.ok) {
        const allReports = await allReportsResponse.json();
        setNearbyReports(allReports.slice(0, 10)); // Show top 10 recent
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const pickMedia = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow media access");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setMedia(asset.uri);

        if (asset.type === "video") {
          setMediaType("VIDEO");
        } else if (asset.type === "image") {
          setMediaType("IMAGE");
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick media");
    }
  };

  const handleSubmitReport = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in title and description");
      return;
    }

    if (!location) {
      Alert.alert("Error", "Location is required");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        email: userEmail,
        title,
        description,
        latitude: location.latitude,
        longitude: location.longitude,
        mediaType: mediaType === "TEXT" ? undefined : mediaType,
        mediaUrl: media || "N/A",
      };

      const response = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        Alert.alert("Error", error.error || "Failed to submit report");
        return;
      }

      Alert.alert("Success", "Report submitted successfully!");
      setTitle("");
      setDescription("");
      setMedia(null);
      setMediaType("TEXT");
      setModalVisible(false);
      await fetchDashboardData();
    } catch (err) {
      console.error("Error submitting report:", err);
      Alert.alert("Error", "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
        return "#ff3b30";
      case "MODERATE":
        return "#ff9500";
      default:
        return "#34c759";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return "#34c759";
      case "IN_PROGRESS":
        return "#ff9500";
      default:
        return "#007aff";
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Issues Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track and report local problems</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalReports}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.resolvedCount}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: "#FFD700" }]}>
            {stats.credibility.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Credibility</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setMediaType("TEXT");
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionLabel}>Report Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setMediaType("IMAGE");
            pickMedia();
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionLabel}>Photo Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setMediaType("VIDEO");
            pickMedia();
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionIcon}>🎥</Text>
          <Text style={styles.actionLabel}>Video Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setMediaType("AUDIO");
            setModalVisible(true);
          }}
        >
          <Text style={styles.actionIcon}>🎙️</Text>
          <Text style={styles.actionLabel}>Voice Report</Text>
        </TouchableOpacity>
      </View>

      {/* Map Preview */}
      {location && (
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            <Marker
              coordinate={location}
              title="Your Location"
              pinColor="blue"
            />
            {nearbyReports.map((report) => (
              report.latitude &&
              report.longitude && (
                <Marker
                  key={report.id}
                  coordinate={{
                    latitude: report.latitude,
                    longitude: report.longitude,
                  }}
                  title={report.title}
                  pinColor={getSeverityColor(report.severity)}
                />
              )
            ))}
          </MapView>
        </View>
      )}

      {/* My Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Recent Reports</Text>
        {userReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reports yet. Start by reporting an issue!</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={userReports.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(item.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={styles.reportDesc}>{item.description.substring(0, 80)}...</Text>
                <View style={styles.reportFooter}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                  <Text style={styles.reportDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Nearby Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Reports</Text>
        {nearbyReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reports from community yet</Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={nearbyReports.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(item.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={styles.reportDesc}>{item.description.substring(0, 80)}...</Text>
                <View style={styles.reportFooter}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                  <Text style={styles.reportDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Submit Report Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Issue Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Pothole on Main Street"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the issue in detail"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              {media && (
                <View style={styles.mediaPreview}>
                  {mediaType === "IMAGE" && (
                    <Image source={{ uri: media }} style={styles.mediaImage} />
                  )}
                  <TouchableOpacity
                    onPress={() => setMedia(null)}
                    style={styles.removeMediaButton}
                  >
                    <Text style={styles.removeMediaText}>Remove Media</Text>
                  </TouchableOpacity>
                </View>
              )}

              {mediaType !== "TEXT" && !media && (
                <TouchableOpacity
                  style={styles.mediaButton}
                  onPress={pickMedia}
                >
                  <Text style={styles.mediaButtonText}>Choose {mediaType}</Text>
                </TouchableOpacity>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.disabledButton]}
                  onPress={handleSubmitReport}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? "Submitting..." : "Submit Report"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#007AFF",
    padding: 16,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  statCard: {
    width: "50%",
    padding: 8,
    backgroundColor: "#fff",
    margin: "auto",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  actionButton: {
    width: "25%",
    padding: 8,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },
  mapSection: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  map: {
    height: 250,
    borderRadius: 12,
  },
  section: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reportTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  reportDesc: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    lineHeight: 18,
  },
  reportFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  reportDate: {
    fontSize: 12,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    fontSize: 28,
    color: "#666",
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  mediaPreview: {
    marginVertical: 12,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  mediaImage: {
    width: "100%",
    height: 200,
  },
  removeMediaButton: {
    padding: 8,
    alignItems: "center",
  },
  removeMediaText: {
    color: "#ff3b30",
    fontWeight: "600",
  },
  mediaButton: {
    backgroundColor: "#e8f4f8",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginVertical: 12,
  },
  mediaButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 16,
    gap: 12,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
});