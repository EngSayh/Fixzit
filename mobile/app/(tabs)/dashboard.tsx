import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Badge,
  Surface,
  Divider,
  Avatar,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNotifications } from '../../contexts/NotificationContext';

const screenWidth = Dimensions.get('window').width;

interface DashboardStats {
  workOrders: { total: number; urgent: number; overdue: number };
  properties: { total: number; occupied: number; maintenance: number };
  finance: { revenue: number; expenses: number; outstanding: number };
  alerts: { count: number; critical: number };
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    workOrders: { total: 47, urgent: 8, overdue: 3 },
    properties: { total: 25, occupied: 22, maintenance: 5 },
    finance: { revenue: 2458300, expenses: 847200, outstanding: 324500 },
    alerts: { count: 12, critical: 2 },
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [12, 19, 15, 25, 22, 18, 20],
        color: (opacity = 1) => `rgba(0, 120, 212, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  });

  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    loadDashboardData();
    
    if (socket) {
      socket.on('dashboard_update', handleDashboardUpdate);
      socket.on('work_order_updated', handleWorkOrderUpdate);
      socket.on('property_alert', handlePropertyAlert);
      
      return () => {
        socket.off('dashboard_update');
        socket.off('work_order_updated');
        socket.off('property_alert');
      };
    }
  }, [socket]);

  const loadDashboardData = async () => {
    try {
      // Simulate API call
      setStats({
        workOrders: { total: 47, urgent: 8, overdue: 3 },
        properties: { total: 25, occupied: 22, maintenance: 5 },
        finance: { revenue: 2458300, expenses: 847200, outstanding: 324500 },
        alerts: { count: 12, critical: 2 },
      });
      
      setRecentActivity([
        {
          id: '1',
          type: 'work_order',
          title: 'New Work Order Created',
          description: 'HVAC maintenance at Metro Tower',
          timestamp: new Date(),
          priority: 'high',
        },
        {
          id: '2',
          type: 'payment',
          title: 'Payment Received',
          description: 'SAR 12,500 from ABC Corporation',
          timestamp: new Date(Date.now() - 3600000),
          priority: 'normal',
        },
        {
          id: '3',
          type: 'alert',
          title: 'Property Alert',
          description: 'Temperature sensor offline in Building A',
          timestamp: new Date(Date.now() - 7200000),
          priority: 'critical',
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard data');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleDashboardUpdate = (data: any) => {
    setStats(prevStats => ({ ...prevStats, ...data }));
  };

  const handleWorkOrderUpdate = (data: any) => {
    setStats(prevStats => ({
      ...prevStats,
      workOrders: {
        ...prevStats.workOrders,
        total: prevStats.workOrders.total + 1,
      },
    }));
  };

  const handlePropertyAlert = (data: any) => {
    setStats(prevStats => ({
      ...prevStats,
      alerts: {
        ...prevStats.alerts,
        count: prevStats.alerts.count + 1,
        critical: data.priority === 'critical' ? prevStats.alerts.critical + 1 : prevStats.alerts.critical,
      },
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderKPICard = (title: string, value: string | number, subtitle?: string, icon?: string, color?: string) => (
    <Card style={[styles.kpiCard, color && { borderLeftColor: color }]}>
      <Card.Content style={styles.kpiContent}>
        <View style={styles.kpiHeader}>
          <Text variant="bodyMedium" style={styles.kpiTitle}>
            {title}
          </Text>
          {icon && (
            <Avatar.Icon
              size={40}
              icon={icon}
              style={[styles.kpiIcon, color && { backgroundColor: color + '20' }]}
              theme={{ colors: { primary: color || '#0078D4' } }}
            />
          )}
        </View>
        <Text variant="headlineMedium" style={styles.kpiValue}>
          {value}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" style={styles.kpiSubtitle}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderActivityItem = (item: any) => (
    <Surface key={item.id} style={styles.activityItem}>
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Avatar.Icon
            size={32}
            icon={getActivityIcon(item.type)}
            style={[
              styles.activityAvatar,
              { backgroundColor: getActivityColor(item.priority) + '20' },
            ]}
            theme={{ colors: { primary: getActivityColor(item.priority) } }}
          />
          <View style={styles.activityText}>
            <Text variant="bodyMedium" style={styles.activityTitle}>
              {item.title}
            </Text>
            <Text variant="bodySmall" style={styles.activityDescription}>
              {item.description}
            </Text>
          </View>
          <Chip
            mode="outlined"
            compact
            style={[
              styles.priorityChip,
              { borderColor: getActivityColor(item.priority) },
            ]}
            textStyle={{ color: getActivityColor(item.priority) }}
          >
            {item.priority}
          </Chip>
        </View>
        <Text variant="bodySmall" style={styles.activityTime}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </Surface>
  );

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'work_order': return 'wrench';
      case 'payment': return 'cash';
      case 'alert': return 'alert';
      default: return 'information';
    }
  };

  const getActivityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#E74C3C';
      case 'high': return '#FF9800';
      case 'normal': return '#0078D4';
      default: return '#666';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 120, 212, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#0078D4',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text variant="headlineSmall" style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              {user?.role?.replace('_', ' ').toUpperCase()} DASHBOARD
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="bell"
              size={24}
              iconColor="#FFFFFF"
              onPress={() => {}}
            />
            {unreadCount > 0 && (
              <Badge style={styles.notificationBadge}>{unreadCount}</Badge>
            )}
            <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#00A859' : '#E74C3C' }]}>
              <Text variant="bodySmall" style={styles.connectionText}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Overview
          </Text>
          <View style={styles.kpiGrid}>
            {renderKPICard(
              'Work Orders',
              stats.workOrders.total,
              `${stats.workOrders.urgent} urgent, ${stats.workOrders.overdue} overdue`,
              'wrench',
              '#0078D4'
            )}
            {renderKPICard(
              'Properties',
              stats.properties.total,
              `${stats.properties.occupied} occupied`,
              'office-building',
              '#00A859'
            )}
            {renderKPICard(
              'Revenue',
              formatCurrency(stats.finance.revenue),
              'This month',
              'cash',
              '#00BCF2'
            )}
            {renderKPICard(
              'Alerts',
              stats.alerts.count,
              `${stats.alerts.critical} critical`,
              'alert',
              '#E74C3C'
            )}
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Work Orders Trend
          </Text>
          <Card style={styles.chartCard}>
            <Card.Content>
              <LineChart
                data={chartData}
                width={screenWidth - 60}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </Card.Content>
          </Card>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Recent Activity
            </Text>
            <Button mode="text" compact onPress={() => {}}>
              View All
            </Button>
          </View>
          <View style={styles.activityList}>
            {recentActivity.map(renderActivityItem)}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <Button
              mode="contained"
              icon="plus"
              style={styles.quickActionButton}
              onPress={() => {}}
            >
              New Work Order
            </Button>
            <Button
              mode="outlined"
              icon="qrcode-scan"
              style={styles.quickActionButton}
              onPress={() => {}}
            >
              Scan QR
            </Button>
            <Button
              mode="outlined"
              icon="file-document"
              style={styles.quickActionButton}
              onPress={() => {}}
            >
              Reports
            </Button>
            <Button
              mode="outlined"
              icon="cog"
              style={styles.quickActionButton}
              onPress={() => {}}
            >
              Settings
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0078D4',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 60,
    backgroundColor: '#E74C3C',
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  kpiSection: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#023047',
    fontWeight: 'bold',
  },
  kpiGrid: {
    gap: 12,
  },
  kpiCard: {
    elevation: 2,
    borderLeftWidth: 4,
  },
  kpiContent: {
    paddingVertical: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiTitle: {
    color: '#666',
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '500',
  },
  kpiIcon: {
    width: 40,
    height: 40,
  },
  kpiValue: {
    fontWeight: 'bold',
    color: '#023047',
    marginBottom: 4,
  },
  kpiSubtitle: {
    color: '#666',
  },
  chartSection: {
    padding: 20,
    paddingTop: 0,
  },
  chartCard: {
    elevation: 2,
  },
  chart: {
    borderRadius: 16,
  },
  activitySection: {
    padding: 20,
    paddingTop: 0,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    padding: 16,
    borderRadius: 8,
    elevation: 1,
  },
  activityContent: {
    gap: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityAvatar: {
    width: 32,
    height: 32,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  activityDescription: {
    color: '#666',
  },
  priorityChip: {
    height: 24,
  },
  activityTime: {
    color: '#666',
    textAlign: 'right',
  },
  quickActionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '48%',
  },
});