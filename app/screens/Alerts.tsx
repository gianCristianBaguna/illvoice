import { useAuth } from '@/contexts/auth-context';
import { useReportRefresh } from '@/contexts/report-refresh-context';
import { BACKEND_URL } from '@/config';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  reportId?: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  address?: string;
}

type AlertItem = {
  kind: 'notification' | 'report';
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
  severity?: string;
  status?: string;
};

function setupEventSource(idToken: string, onNotification: (notification: Notification) => void) {
  const abortController = new AbortController();
  let lastNotificationIds: Set<string> = new Set();
  
  const poll = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications?poll=true`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        console.error('SSE poll failed:', response.status);
        return;
      }

      const notifications: Notification[] = await response.json();
      
      if (Array.isArray(notifications) && notifications.length > 0) {
        notifications.forEach((n) => {
          if (!lastNotificationIds.has(n.id)) {
            lastNotificationIds.add(n.id);
            onNotification(n);
          }
        });
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        console.error('SSE poll error:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setTimeout(poll, 3000);
      }
    }
  };

  poll();

  return {
    close: () => abortController.abort(),
  };
}

export default function AlertsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userEmail, idToken } = useAuth();
  const { refreshKey, triggerRefresh } = useReportRefresh();

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!userEmail || !idToken) return;
    try {
      if (!isRefresh) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Fetch error:', error);
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail, idToken]);

  const fetchReports = useCallback(async () => {
    if (!userEmail || !idToken) return;
    try {
      const response = await fetch(`${BACKEND_URL}/dashboard/reports/by-email`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setReports(Array.isArray(data) ? data.slice(0, 20) : []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }, [userEmail, idToken]);

  useEffect(() => {
    fetchNotifications();
    fetchReports();
  }, [fetchNotifications, fetchReports, refreshKey]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotifications(true), fetchReports()]);
  }, [fetchNotifications, fetchReports]);

  useEffect(() => {
    if (!idToken) return;

    const es = setupEventSource(idToken, (notification) => {
      setNotifications(prev => {
        if (prev.find(n => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });

      if (notification.type === 'AI_ANALYSIS_COMPLETE') {
        triggerRefresh();
      }
    });

    return () => {
      es.close();
    };
  }, [fetchNotifications, idToken]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'STATUS_UPDATE':
        return { name: 'refresh-outline', color: '#1E3A8A' };
      case 'CREDIBILITY_UPDATE':
        return { name: 'star-outline', color: '#f59e0b' };
      case 'NEW_REPORT':
        return { name: 'document-text-outline', color: '#16a34a' };
      default:
        return { name: 'notifications-outline', color: '#6b7280' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return '#ff3b30';
      case 'MODERATE':
        return '#ff9500';
      default:
        return '#34c759';
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return { color: '#34c759', icon: 'checkmark-circle' as const, label: 'Resolved' };
      case 'IN_PROGRESS':
        return { color: '#1E3A8A', icon: 'time' as const, label: 'In Progress' };
      default:
        return { color: '#8e8e93', icon: 'hourglass' as const, label: 'Pending' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const combinedAlerts: AlertItem[] = [
    ...notifications.map(n => ({
      kind: 'notification' as const,
      id: n.id,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      read: n.read,
    })),
    ...reports.map(r => ({
      kind: 'report' as const,
      id: r.id,
      title: r.title,
      message: r.description,
      createdAt: r.createdAt,
      severity: r.severity,
      status: r.status,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const renderItem = ({ item }: { item: AlertItem }) => {
    if (item.kind === 'notification') {
      const iconConfig = getNotificationIcon(item.title.includes('Status') ? 'STATUS_UPDATE' : item.title.includes('Credibility') ? 'CREDIBILITY_UPDATE' : 'NEW_REPORT');
      return (
        <TouchableOpacity
          style={[styles.notificationCard, !item.read && styles.unreadCard]}
          onPress={() => item.read !== undefined && !item.read && markAsRead(item.id)}
          activeOpacity={0.6}
        >
          <View style={styles.notificationLeft}>
            {item.read === false && <View style={styles.unreadIndicator} />}
            <View style={[styles.iconContainer, { backgroundColor: iconConfig.color + '15' }]}>
              <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
            </View>
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={[styles.notificationTitle, item.read === false && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    const statusConfig = getStatusConfig(item.status || 'PENDING');
    const severityColor = getSeverityColor(item.severity || 'LOW');
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={[styles.reportSeverityDot, { backgroundColor: severityColor }]} />
          <View style={styles.reportContent}>
            <Text style={styles.reportTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.reportMeta}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.reportStatusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
            <Text style={[styles.reportStatusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.reportMessage} numberOfLines={2}>{item.message}</Text>
      </View>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSubtitle}>
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
        </Text>
      </View>

      {combinedAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color="#c7c7cc" />
          <Text style={styles.emptyTitle}>No alerts yet</Text>
          <Text style={styles.emptySubtitle}>We'll notify you when your reports are updated</Text>
        </View>
      ) : (
        <FlatList
          data={combinedAlerts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    overflow: 'hidden',
  },
  unreadCard: {
    backgroundColor: '#f8faff',
    borderColor: '#1E3A8A',
    borderWidth: 2,
  },
  notificationLeft: {
    position: 'relative',
    padding: 12,
    justifyContent: 'center',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E3A8A',
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#1E3A8A',
  },
  notificationTime: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f5',
    gap: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  reportSeverityDot: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 18,
  },
  reportMeta: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  reportStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  reportStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
});
