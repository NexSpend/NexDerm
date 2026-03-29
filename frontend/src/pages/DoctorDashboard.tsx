import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/commonStyles';
import { getPendingCases, PendingCase } from '../services/api';
import CaseReviewScreen from './CaseReviewScreen';

interface DoctorDashboardProps {
  onLogout: () => void;
}

type DashboardFilter = 'all' | 'needs-attention' | 'high-confidence' | 'today';

export default function DoctorDashboard({ onLogout }: DoctorDashboardProps) {
  const [pendingCases, setPendingCases] = useState<PendingCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<PendingCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('all');

  const fetchPendingCases = useCallback(async () => {
    try {
      setIsLoading(true);
      const cases = await getPendingCases();
      setPendingCases(cases);
    } catch (error) {
      console.error('Error fetching pending cases:', error);
      Alert.alert('Error', 'Failed to load pending cases. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCases();
  }, [fetchPendingCases]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchPendingCases();
  }, [fetchPendingCases]);

  const handleCaseReviewed = () => {
    setSelectedCase(null);
    fetchPendingCases();
  };

  const searchFilteredCases = pendingCases.filter(
    (item) =>
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prediction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user_name &&
        item.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.user_email &&
        item.user_email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isToday = (timestamp: string) => {
    const createdAt = new Date(timestamp);
    const now = new Date();

    return (
      createdAt.getFullYear() === now.getFullYear() &&
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getDate() === now.getDate()
    );
  };

  const filteredCases = searchFilteredCases.filter((item) => {
    if (activeFilter === 'needs-attention') {
      return item.confidence < 0.6;
    }

    if (activeFilter === 'high-confidence') {
      return item.confidence >= 0.8;
    }

    if (activeFilter === 'today') {
      return isToday(item.created_at);
    }

    return true;
  });

  const needsAttentionCount = pendingCases.filter((item) => item.confidence < 0.6).length;
  const highConfidenceCount = pendingCases.filter((item) => item.confidence >= 0.8).length;
  const todayCasesCount = pendingCases.filter((item) => isToday(item.created_at)).length;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selectedCase) {
    return (
      <CaseReviewScreen
        selectedCase={selectedCase}
        onBack={handleCaseReviewed}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Doctor Portal</Text>
          <Text style={styles.headerSubtitle}>Review and respond to submitted cases</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.metricCard,
            styles.metricCardPending,
            activeFilter === 'all' && styles.metricCardActive,
          ]}
          onPress={() => setActiveFilter((prev) => (prev === 'all' ? 'all' : 'all'))}
        >
          <Text style={styles.metricLabel}>Pending</Text>
          <Text style={styles.metricValue}>{pendingCases.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.metricCard,
            styles.metricCardNeedsAttention,
            activeFilter === 'needs-attention' && styles.metricCardActive,
          ]}
          onPress={() =>
            setActiveFilter((prev) =>
              prev === 'needs-attention' ? 'all' : 'needs-attention'
            )
          }
        >
          <Text style={styles.metricLabel}>Needs Attention</Text>
          <Text style={styles.metricValue}>{needsAttentionCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.metricCard,
            styles.metricCardHighConfidence,
            activeFilter === 'high-confidence' && styles.metricCardActive,
          ]}
          onPress={() =>
            setActiveFilter((prev) =>
              prev === 'high-confidence' ? 'all' : 'high-confidence'
            )
          }
        >
          <Text style={styles.metricLabel}>High Confidence</Text>
          <Text style={styles.metricValue}>{highConfidenceCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.metricCard,
            styles.metricCardToday,
            activeFilter === 'today' && styles.metricCardActive,
          ]}
          onPress={() => setActiveFilter((prev) => (prev === 'today' ? 'all' : 'today'))}
        >
          <Text style={styles.metricLabel}>Submitted Today</Text>
          <Text style={styles.metricValue}>{todayCasesCount}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or prediction"
          placeholderTextColor={colors.textPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {isLoading && pendingCases.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Loading pending cases...</Text>
          </View>
        ) : filteredCases.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No pending cases</Text>
            <Text style={styles.emptyStateText}>All caught up for now. Pull to refresh when new cases arrive.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Pending Case Queue</Text>
            {activeFilter !== 'all' && (
              <Text style={styles.activeFilterText}>Filter active: {activeFilter.replace('-', ' ')}</Text>
            )}
          <FlatList
            data={filteredCases}
            keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                  activeOpacity={0.85}
                style={styles.caseCard}
                onPress={() => setSelectedCase(item)}
              >
                  <View style={styles.caseTopRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>
                        {(item.user_name?.trim()?.[0] || item.user_email?.trim()?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.caseIdentityWrap}>
                      <Text style={styles.caseName}>{item.user_name || 'Unknown User'}</Text>
                      <Text style={styles.caseEmail}>{item.user_email || 'No email provided'}</Text>
                    </View>
                    <Text style={styles.reviewCta}>Review</Text>
                  </View>

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Prediction</Text>
                      <Text style={styles.infoValue}>{item.prediction}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Confidence</Text>
                      <Text style={styles.infoValuePrimary}>{(item.confidence * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Created</Text>
                      <Text style={styles.infoValue}>{formatTimestamp(item.created_at)}</Text>
                    </View>
                  </View>
              </TouchableOpacity>
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.secondaryButtonBg,
    borderWidth: 1,
    borderColor: colors.secondaryButtonBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  logoutButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '48%',
    marginBottom: 8,
  },
  metricCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metricCardPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  metricCardNeedsAttention: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  metricCardHighConfidence: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  metricCardToday: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FCFDFF',
    borderWidth: 1,
    borderColor: '#D6E3F8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  listContent: {
    paddingBottom: 24,
  },
  caseCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    borderLeftWidth: 4,
    borderLeftColor: '#9EC5FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  caseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  caseIdentityWrap: {
    flex: 1,
  },
  caseName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  caseEmail: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewCta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  infoGrid: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  infoValuePrimary: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  loaderWrap: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyStateCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    padding: 18,
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
