import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';

interface HistoryPageProps {
  onBackToAccount: () => void;
}

export default function HistoryPage({ onBackToAccount }: HistoryPageProps) {
  return (
    <SafeAreaView style={commonStyles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToAccount}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>📋</Text>
          <Text style={styles.placeholderTitle}>Medical History</Text>
          <Text style={styles.placeholderSubtitle}>Database integration coming soon</Text>
        </View>
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
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 64,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
