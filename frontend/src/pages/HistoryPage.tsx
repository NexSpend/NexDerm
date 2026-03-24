import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { getMedicalHistory } from '../services/api';

interface HistoryPageProps {
  isGuest: boolean;
  onBackToAccount: () => void;
}

type MedicalHistoryItem = {
  id: number;
  prediction: string | null;
  confidence: number | null;
  report_url: string | null;
  created_at: string | null;
};

export default function HistoryPage({
  isGuest,
  onBackToAccount,
}: HistoryPageProps) {
  const [history, setHistory] = useState<MedicalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) {
      setHistory([]);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    loadHistory();
  }, [isGuest]);

  const loadHistory = async () => {
    if (isGuest) {
      setHistory([]);
      setErrorMessage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const data = await getMedicalHistory();
      console.log('MEDICAL HISTORY:', data);
      setHistory(data);
    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to load medical history');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: MedicalHistoryItem }) => (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.prediction}>
          {item.prediction || 'Unknown'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.confidence != null ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A'}
          </Text>
        </View>
      </View>

      <Text style={styles.detailLabel}>Confidence</Text>
      <Text style={styles.detailValue}>
        {item.confidence != null ? `${(item.confidence * 100).toFixed(2)}%` : 'N/A'}
      </Text>

      <Text style={styles.detailLabel}>Date</Text>
      <Text style={styles.detailValue}>
        {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToAccount}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical History</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusText}>Loading history...</Text>
          </View>
        ) : isGuest ? (
          <View style={styles.centerContent}>
            <Text style={styles.placeholderText}>🔒</Text>
            <Text style={styles.placeholderTitle}>History is unavailable in guest mode</Text>
            <Text style={styles.placeholderSubtitle}>
              Sign up or log in to save and view past reports
            </Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerContent}>
            <Text style={styles.placeholderText}>⚠️</Text>
            <Text style={styles.placeholderTitle}>{errorMessage}</Text>
            <Text style={styles.placeholderSubtitle}>
              Please try again
            </Text>

            <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.placeholderText}>📋</Text>
            <Text style={styles.placeholderTitle}>No History Yet</Text>
            <Text style={styles.placeholderSubtitle}>
              Your previous detection results will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textSecondary,
  },
  placeholderText: {
    fontSize: 56,
    marginBottom: 8,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  row: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prediction: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 12,
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
});