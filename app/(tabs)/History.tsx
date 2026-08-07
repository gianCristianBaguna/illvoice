import { useAuth } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Report {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  multimedia?: { type: string; url: string }[];
  remarks?: string | null;
  resolutionNotes?: string | null;
}

interface HistoryStats {
  total: number;
  resolved: number;
  pending: number;
  inProgress: number;
  avgResolutionTime: string;
}

export default function HistoryScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    total: 0,
    resolved: 0,
    pending: 0,
    inProgress: 0,
    avgResolutionTime: 'N/A',
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { userEmail, idToken } = useAuth();

  const fetchReports = useCallback(async (isRefresh = false) => {
    if (!userEmail || !idToken) {
      if (!userEmail) {
        Alert.alert('Error', 'Please log in first');
      }
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }

      const data = await response.json();
      const reportList = Array.isArray(data) ? data : [];
      setReports(reportList);

      const total = reportList.length;
      const resolved = reportList.filter((r: Report) => r.status === 'RESOLVED').length;
      const pending = reportList.filter((r: Report) => r.status === 'PENDING').length;
      const inProgress = reportList.filter((r: Report) => r.status === 'IN_PROGRESS').length;

      setStats({
        total,
        resolved,
        pending,
        inProgress,
        avgResolutionTime: resolved > 0 ? '2-3 days' : 'N/A',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch reports');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail, idToken]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return '#dc2626';
      case 'MODERATE':
        return '#ea8900';
      case 'LOW':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { color: '#dc2626', icon: 'hourglass' as const, label: 'Pending' };
      case 'IN_PROGRESS':
        return { color: '#2563eb', icon: 'refresh-circle' as const, label: 'In Progress' };
      case 'RESOLVED':
        return { color: '#34c759', icon: 'checkmark-circle' as const, label: 'Resolved' };
      default:
        return { color: '#6b7280', icon: 'help-circle' as const, label: 'Unknown' };
    }
  };

  const openReportDetail = (report: Report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const filteredReports = reports.filter((report) => {
    if (selectedFilter === 'ALL') return true;
    return report.status === selectedFilter;
  });

  const renderReportItem = ({ item }: { item: Report }) => {
    const statusConfig = getStatusConfig(item.status);
    return (
      <TouchableOpacity style={styles.reportCard} activeOpacity={0.7} onPress={() => openReportDetail(item)}>
        <View style={styles.reportHeader}>
          <View style={styles.reportCardLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          </View>
          <View style={styles.reportCardContent}>
            <Text style={styles.reportTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.reportDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: getSeverityColor(item.severity) + '15' }
            ]}
          >
            <Text style={[styles.badgeText, { color: getSeverityColor(item.severity) }]}>
              {item.severity}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#c7c7cc" style={styles.reportCardArrow} />
        </View>

        <Text style={styles.reportDescription} numberOfLines={2}>{item.description}</Text>

         {item.multimedia && item.multimedia.length > 0 && (
           <View style={styles.mediaIndicator}>
             <Ionicons name="attach" size={14} color="#8e8e93" />
             <Text style={styles.mediaText}>{item.multimedia.length} attachment{item.multimedia.length > 1 ? 's' : ''}</Text>
           </View>
         )}

         {(item as any).address && (
           <View style={styles.locationIndicator}>
             <Ionicons name="location" size={14} color="#1E3A8A" />
             <Text style={styles.locationText} numberOfLines={1}>{(item as any).address}</Text>
           </View>
         )}

         <View style={styles.reportFooter}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.color + '15' }
            ]}
          >
            <Ionicons name={statusConfig.icon} size={11} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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

  if (!userEmail) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={[styles.headerView, { backgroundColor: '#1E3A8A' }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={styles.greetingText}>Issue History</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color="#c7c7cc" />
          <Text style={styles.emptyText}>Please log in to view history</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerContainer}>
        <View style={[styles.headerView, { backgroundColor: '#1E3A8A' }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>Issue History</Text>
              <Text style={styles.headerSubtitle}>Track all your reports and their status</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchReports(true);
            }}
            colors={['#1E3A8A']}
          />
        }
      >
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#fff' }]}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.statNumber, { color: '#16a34a' }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f5f5ff' }]}>
            <Text style={[styles.statNumber, { color: '#2563eb' }]}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
            <Text style={[styles.statNumber, { color: '#dc2626' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter && styles.filterButtonTextActive,
                ]}
              >
                {filter === 'ALL' ? 'All' : filter === 'IN_PROGRESS' ? 'In Progress' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#c7c7cc" />
            <Text style={styles.emptyText}>No {selectedFilter !== 'ALL' ? selectedFilter.toLowerCase() : ''} reports</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'ALL'
                ? 'Your reports will appear here'
                : `Switch filters to see all reports`}
            </Text>
          </View>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={filteredReports}
            keyExtractor={(item) => item.id}
            renderItem={renderReportItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  content: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerView: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
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
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    gap: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reportCardLeft: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: '#e5e5ea',
  },
  statusDot: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  reportCardContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 20,
  },
  reportDate: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reportDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8f9fb',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mediaText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  locationText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '500',
    flex: 1,
  },
  reportFooter: {
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
    fontWeight: '600',
  },
  reportCardArrow: {
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
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
    color: '#8e8e93',
    fontWeight: '500',
    marginLeft: 8,
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#1a1a2e',
    fontWeight: '600',
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
});