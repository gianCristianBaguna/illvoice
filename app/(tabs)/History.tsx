import { useAuth } from '@/app/services/auth-context';
import React, { useEffect, useState } from 'react';
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

const BACKEND_URL = 'http://192.168.50.203:4000';

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
  const { userEmail } = useAuth();

  const fetchReports = async (isRefresh = false) => {
    if (!userEmail) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': userEmail,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }

      const data = await response.json();
      const reportList = Array.isArray(data) ? data : [];
      setReports(reportList);

      // Calculate statistics
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
  };

  useEffect(() => {
    fetchReports();
  }, [userEmail]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#dc2626';
      case 'IN_PROGRESS':
        return '#2563eb';
      case 'RESOLVED':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '⏳';
      case 'IN_PROGRESS':
        return '🔄';
      case 'RESOLVED':
        return '✅';
      default:
        return '❓';
    }
  };

  const filteredReports = reports.filter((report) => {
    if (selectedFilter === 'ALL') return true;
    return report.status === selectedFilter;
  });

  const renderReportItem = ({ item }: { item: Report }) => (
    <TouchableOpacity style={styles.reportCard} activeOpacity={0.7}>
      <View style={styles.reportHeader}>
        <View style={styles.statusIconContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
        </View>
        <View style={styles.reportTitleContainer}>
          <Text style={styles.reportTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.reportDate}>
            {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View
          style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(item.severity) },
          ]}
        >
          <Text style={styles.badgeText}>{item.severity}</Text>
        </View>
      </View>

      <Text style={styles.reportDescription} numberOfLines={2}>{item.description}</Text>

      {item.multimedia && item.multimedia.length > 0 && (
        <View style={styles.mediaIndicator}>
          <Text style={styles.mediaIcon}>📎</Text>
          <Text style={styles.mediaText}>{item.multimedia.length} attachment{item.multimedia.length > 1 ? 's' : ''}</Text>
        </View>
      )}

      <View style={styles.reportFooter}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your reports...</Text>
      </View>
    );
  }

  if (!userEmail) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Please log in to view history</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Issue History</Text>
        <Text style={styles.headerSubtitle}>Track all your reports and their status</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchReports(true);
            }}
          />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#16a34a' }]}>{stats.resolved}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2563eb' }]}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#dc2626' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Filter Tabs */}
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

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '50%',
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 4,
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#007AFF',
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  statusIconContainer: {
    fontSize: 20,
  },
  statusIcon: {
    fontSize: 20,
  },
  reportTitleContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 20,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  reportDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  mediaIcon: {
    fontSize: 14,
  },
  mediaText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  emptyContainer: {
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
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
