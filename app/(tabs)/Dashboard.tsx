import { useAuth } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import { router } from 'expo-router';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Report {
  id: string;
  title: string;
  description: string;
  severity: "LOW" | "MODERATE" | "HIGH";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  multimedia?: { type: string; url: string }[];
  remarks?: string | null;
  resolutionNotes?: string | null;
}

export default function Dashboard() {
  const { userEmail, userName, userPhoto, idToken, emailVerified } = useAuth();
  const insets = useSafeAreaInsets();
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadDashboardData = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      };

      const reportsResponse = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        headers,
      });

      if (!reportsResponse.ok) {
        const error = await reportsResponse.json().catch(() => ({}));
        throw new Error(error.error || `Failed to fetch reports: ${reportsResponse.status}`);
      }

      const reports = await reportsResponse.json();
      const reportList = Array.isArray(reports) ? reports : [];
      setUserReports(reportList);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [userEmail, idToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { color: "#34c759", icon: "checkmark-circle" as const, label: "Resolved" };
      case "IN_PROGRESS":
        return { color: "#1E3A8A", icon: "time" as const, label: "In Progress" };
      default:
        return { color: "#8e8e93", icon: "hourglass" as const, label: "Pending" };
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

  const handleReportPress = () => {
    router.push('/report');
  };

  const openReportDetail = (report: Report) => {
    setSelectedReport(report);
    setModalVisible(true);
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Verification Banner (verify later) */}
      {!emailVerified && (
        <View style={[styles.verifyBanner, { paddingTop: Math.max(insets.top, 8) }]}>
          <Ionicons name="shield-outline" size={20} color="#1E3A8A" />
          <Text style={styles.verifyBannerText}>
            Please verify your email to unlock the full experience
          </Text>
          <TouchableOpacity
            style={styles.verifyBannerButton}
            onPress={() => router.push("/(auth)/verify-email")}
          >
            <Text style={styles.verifyBannerButtonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.headerView, { backgroundColor: '#1E3A8A' }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Image source={require('../../assets/images/ILLVOICE-LOGO.png')} style={styles.headerLogo} />
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.userNameText}>{userName || "User"}</Text>
              <Text style={styles.subtitleText}>Here's what's happening with your reports</Text>
            </View>
            <View style={styles.avatarContainer}>
              {userPhoto ? (
                <Image
                  source={{ uri: userPhoto }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
              )}
              {emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              ) : (
                <View style={styles.avatarBadge}>
                  <Ionicons name="star" size={12} color="#fff" />
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Hero Report Button */}
      <TouchableOpacity style={styles.heroButtonContainer} onPress={handleReportPress} activeOpacity={0.9}>
        <View style={styles.heroButton}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroButtonTitle}>Submit a Report</Text>
              <Text style={styles.heroButtonSubtitle}>Report an issue in your community</Text>
            </View>
            <View style={styles.heroIconWrapper}>
              <View style={styles.heroIconInner}>
                <Ionicons name="megaphone" size={28} color="#fff" />
              </View>
              <View style={styles.heroPulseRing} />
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroBottomRow}>
            <View style={styles.heroFeatureRow}>
              <View style={styles.heroFeatureDot} />
              <Text style={styles.heroFeatureText}>Quick</Text>
              <View style={styles.heroFeatureDot} />
              <Text style={styles.heroFeatureText}>Secure</Text>
              <View style={styles.heroFeatureDot} />
              <Text style={styles.heroFeatureText}>Trackable</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={styles.quickAction} onPress={() => {}}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#f0f0ff' }]}>
            <Ionicons name="map" size={22} color="#1E3A8A" />
          </View>
          <Text style={styles.quickActionText}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => {}}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="people" size={22} color="#166534" />
          </View>
          <Text style={styles.quickActionText}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => {}}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="call" size={22} color="#9a3412" />
          </View>
          <Text style={styles.quickActionText}>Emergency</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/history')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#f5f5ff' }]}>
            <Ionicons name="time" size={22} color="#1E3A8A" />
          </View>
          <Text style={styles.quickActionText}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Reports */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          {userReports.length > 0 && (
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{userReports.length}</Text>
            </View>
          )}
        </View>

        {userReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#c7c7cc" />
            <Text style={styles.emptyText}>No reports yet</Text>
            <Text style={styles.emptySubtext}>Your submitted reports will appear here</Text>
          </View>
        ) : (
          <View style={[styles.reportsList, userReports.length > 5 && styles.reportsListScrollable]}>
            {userReports.slice(0, 10).map((item) => {
              const statusConfig = getStatusConfig(item.status);
              return (
                <TouchableOpacity key={item.id} style={styles.reportCard} activeOpacity={0.6} onPress={() => openReportDetail(item)}>
                  <View style={styles.reportCardLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                  </View>
                  <View style={styles.reportCardContent}>
                    <Text style={styles.reportTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.reportDesc} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.reportCardFooter}>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                        <Ionicons name={statusConfig.icon} size={11} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.label}
                        </Text>
                      </View>
                      <Text style={styles.reportDate}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#c7c7cc" style={styles.reportCardArrow} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Report Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report Details</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalReportHeader}>
                    <Text style={styles.modalReportTitle}>{selectedReport.title}</Text>
                    <View style={[
                      styles.modalStatusBadge,
                      { backgroundColor: getStatusConfig(selectedReport.status).color + '20' }
                    ]}>
                      <Ionicons name={getStatusConfig(selectedReport.status).icon} size={14} color={getStatusConfig(selectedReport.status).color} />
                      <Text style={[styles.modalStatusText, { color: getStatusConfig(selectedReport.status).color }]}>
                        {getStatusConfig(selectedReport.status).label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <View style={styles.modalDetailItem}>
                      <Ionicons name="calendar-outline" size={18} color="#8e8e93" />
                      <Text style={styles.modalDetailLabel}>Date Reported</Text>
                      <Text style={styles.modalDetailValue}>
                        {new Date(selectedReport.createdAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>

                  {selectedReport.severity && (
                    <View style={styles.modalDetailRow}>
                      <View style={styles.modalDetailItem}>
                        <Ionicons name="warning-outline" size={18} color="#8e8e93" />
                        <Text style={styles.modalDetailLabel}>Severity</Text>
                        <Text style={[styles.modalDetailValue, { color: getSeverityColor(selectedReport.severity) }]}>
                          {selectedReport.severity}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.modalDescriptionSection}>
                    <Text style={styles.modalSectionLabel}>Description</Text>
                    <Text style={styles.modalDescription}>{selectedReport.description}</Text>
                  </View>

                  {selectedReport.remarks && (
                    <View style={styles.modalRemarksSection}>
                      <Text style={styles.modalSectionLabel}>Remarks</Text>
                      <View style={styles.modalRemarksBox}>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#1E3A8A" />
                        <Text style={styles.modalRemarksText}>{selectedReport.remarks}</Text>
                      </View>
                    </View>
                  )}

                  {selectedReport.resolutionNotes && (
                    <View style={styles.modalResolutionSection}>
                      <Text style={styles.modalSectionLabel}>Resolution Notes</Text>
                      <View style={styles.modalResolutionBox}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#34c759" />
                        <Text style={styles.modalResolutionText}>{selectedReport.resolutionNotes}</Text>
                      </View>
                    </View>
                  )}

                  {selectedReport.address && (
                    <View style={styles.modalLocationSection}>
                    <Text style={styles.modalSectionLabel}>Location</Text>
                    <View style={styles.modalLocationRow}>
                      <Ionicons name="location-outline" size={16} color="#1E3A8A" />
                      <Text style={styles.modalLocationText} numberOfLines={2}>
                        {selectedReport.address}
                      </Text>
                    </View>
                  </View>
                  )}

                  {!selectedReport.address && selectedReport.latitude && selectedReport.longitude && (
                    <View style={styles.modalLocationSection}>
                    <Text style={styles.modalSectionLabel}>Location</Text>
                    <View style={styles.modalLocationRow}>
                      <Ionicons name="location-outline" size={16} color="#1E3A8A" />
                      <Text style={styles.modalLocationText}>
                      {selectedReport.latitude.toFixed(6)}, {selectedReport.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                  )}

                  {selectedReport.multimedia && selectedReport.multimedia.length > 0 && (
                    <View style={styles.modalMediaSection}>
                      <Text style={styles.modalSectionLabel}>Attachments</Text>
                      <View style={styles.modalMediaGrid}>
                        {selectedReport.multimedia.map((media, index) => (
                          <View key={index} style={styles.modalMediaItem}>
                            <Ionicons name="image-outline" size={24} color="#8e8e93" />
                            <Text style={styles.modalMediaType}>{media.type}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity style={styles.modalCloseButtonRow} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
  headerLogo: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  userNameText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "400",
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
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#1E3A8A',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#34c759',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#1E3A8A',
  },
  heroButtonContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  heroButton: {
    borderRadius: 24,
    backgroundColor: '#ff3b30',
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroButtonTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroButtonSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  heroIconWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPulseRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  heroFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroFeatureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  heroFeatureText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 10,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  section: {
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  sectionCount: {
    backgroundColor: '#e5e5ea',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#f0f0f5',
  },
  emptyText: {
    fontSize: 16,
    color: "#1E3A8A",
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8e8e93",
    textAlign: "center",
  },
  reportsList: {
    gap: 10,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    gap: 12,
  },
  reportCardLeft: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: '#e5e5ea',
  },
  reportCardContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E3A8A",
    marginBottom: 3,
  },
  reportDesc: {
    fontSize: 13,
    color: "#8e8e93",
    marginBottom: 8,
  },
  reportCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  reportDate: {
    fontSize: 12,
    color: "#8e8e93",
  },
  reportCardArrow: {
    marginLeft: 4,
  },
  reportsListScrollable: {
    maxHeight: 400,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalReportHeader: {
    marginBottom: 20,
  },
  modalReportTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
    lineHeight: 28,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalDetailRow: {
    marginBottom: 16,
  },
  modalDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8f9fb',
    padding: 14,
    borderRadius: 12,
  },
  modalDetailLabel: {
    fontSize: 13,
    color: "#8e8e93",
    fontWeight: "500",
    marginLeft: 8,
  },
  modalDetailValue: {
    fontSize: 14,
    color: "#1a1a2e",
    fontWeight: "600",
    marginLeft: 'auto',
  },
  modalDescriptionSection: {
    marginBottom: 20,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    backgroundColor: '#f8f9fb',
    padding: 16,
    borderRadius: 12,
  },
  modalRemarksSection: {
    marginBottom: 20,
  },
  modalRemarksBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eef2ff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  modalRemarksText: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
  modalResolutionSection: {
    marginBottom: 20,
  },
  modalResolutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  modalResolutionText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  modalLocationSection: {
    marginBottom: 20,
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fb',
    padding: 14,
    borderRadius: 12,
  },
  modalLocationText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  modalMediaSection: {
    marginBottom: 20,
  },
  modalMediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalMediaItem: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  modalMediaType: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalCloseButtonRow: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
  verifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8eaf6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  verifyBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#1E3A8A",
    fontWeight: "500",
  },
  verifyBannerButton: {
    backgroundColor: "#1E3A8A",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  verifyBannerButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
