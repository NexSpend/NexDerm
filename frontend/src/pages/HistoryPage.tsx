import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { downloadReportPdf, getMedicalHistory, MedicalHistoryItem } from '../services/api';

interface HistoryPageProps {
  isGuest: boolean;
  onBackToAccount: () => void;
}

export default function HistoryPage({
  isGuest,
  onBackToAccount,
}: HistoryPageProps) {
  const [history, setHistory] = useState<MedicalHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<MedicalHistoryItem | null>(null);
  const [detailImageFailed, setDetailImageFailed] = useState(false);
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

  const renderItem = ({ item }: { item: MedicalHistoryItem }) => {
    const status = (item.status || 'Pending').toLowerCase();
    const isReviewed = status === 'reviewed';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.9}
        onPress={() => {
          setDetailImageFailed(false);
          setSelectedHistoryItem(item);
        }}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.prediction}>{item.prediction || 'Unknown'}</Text>
          <View style={[styles.statusPill, isReviewed ? styles.statusPillReviewed : styles.statusPillPending]}>
            <Text style={[styles.statusPillText, isReviewed ? styles.statusPillTextReviewed : styles.statusPillTextPending]}>
              {isReviewed ? 'Reviewed' : 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Confidence</Text>
          <Text style={styles.metaValue}>
            {item.confidence != null ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A'}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Submitted</Text>
          <Text style={styles.metaValue}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
          </Text>
        </View>
        <Text style={styles.tapHint}>Tap to view details</Text>
      </TouchableOpacity>
    );
  };

  if (selectedHistoryItem) {
    const item = selectedHistoryItem;
    const status = (item.status || 'Pending').toLowerCase();
    const isReviewed = status === 'reviewed';

    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedHistoryItem(null)}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.prediction}>{item.prediction || 'Unknown'}</Text>
              <View style={[styles.statusPill, isReviewed ? styles.statusPillReviewed : styles.statusPillPending]}>
                <Text style={[styles.statusPillText, isReviewed ? styles.statusPillTextReviewed : styles.statusPillTextPending]}>
                  {isReviewed ? 'Reviewed' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Confidence</Text>
              <Text style={styles.metaValue}>
                {item.confidence != null ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Submitted</Text>
              <Text style={styles.metaValue}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
              </Text>
            </View>

            <View style={styles.imageSection}>
              <Text style={styles.doctorLabel}>Uploaded Image</Text>
              {item.image_url && !detailImageFailed ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.caseImage}
                  resizeMode="cover"
                  onError={() => setDetailImageFailed(true)}
                />
              ) : (
                <Text style={styles.noImageText}>No image available for this case.</Text>
              )}
            </View>

            {isReviewed && item.final_diagnosis ? (
              <View style={styles.doctorBox}>
                <Text style={styles.doctorLabel}>Doctor Diagnosis</Text>
                <Text style={styles.doctorValue}>{item.final_diagnosis}</Text>

                {item.doctor_notes ? (
                  <>
                    <Text style={styles.doctorLabelSecondary}>Doctor Notes</Text>
                    <Text style={styles.doctorNotes}>{item.doctor_notes}</Text>
                  </>
                ) : null}

                {item.reviewed_at ? (
                  <Text style={styles.reviewedOn}>Reviewed on {new Date(item.reviewed_at).toLocaleString()}</Text>
                ) : null}
              </View>
            ) : null}

            {item.report_url ? (
              <TouchableOpacity style={styles.reportButton} onPress={() => downloadReportPdf(item.report_url as string)}>
                <Text style={styles.reportButtonText}>Open Report PDF</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            keyExtractor={(item) => item.id}
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
  detailContent: {
    padding: 16,
    paddingBottom: 24,
  },
  row: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E4E9F1',
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prediction: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusPillReviewed: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusPillTextReviewed: {
    color: '#166534',
  },
  statusPillTextPending: {
    color: '#92400E',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginLeft: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  tapHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  imageSection: {
    marginTop: 12,
  },
  caseImage: {
    marginTop: 8,
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
  },
  noImageText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  doctorBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEEF3',
    paddingTop: 10,
  },
  doctorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  doctorLabelSecondary: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  doctorValue: {
    marginTop: 4,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  doctorNotes: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  reviewedOn: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textTertiary,
  },
  reportButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF4FF',
    borderColor: '#D7E5FF',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  reportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
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