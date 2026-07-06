import { useAuth } from '@/contexts/auth-context';
import { BACKEND_URL } from '@/config';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  multimedia?: { type: string; url: string }[];
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

  const filteredReports = reports.filter((report) => {
    if (selectedFilter === 'ALL') return true;
    return report.status === selectedFilter;
  });

  const renderReportItem = ({ item }: { item: Report }) => {
    const statusConfig = getStatusConfig(item.status);
    return (
      <TouchableOpacity style={styles.reportCard} activeOpacity={0.7}>
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
        </View>

        <Text style={styles.reportDescription} numberOfLines={2}>{item.description}</Text>

        {item.multimedia && item.multimedia.length > 0 && (
          <View style={styles.mediaIndicator}>
            <Ionicons name="attach" size={14} color="#8e8e93" />
            <Text style={styles.mediaText}>{item.multimedia.length} attachment{item.multimedia.length > 1 ? 's' : ''}</Text>
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
});