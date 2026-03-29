import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { colors } from '../utils/commonStyles';
import { PendingCase, submitDoctorReview } from '../services/api';

interface CaseReviewScreenProps {
  selectedCase: PendingCase;
  onBack: () => void;
}

export default function CaseReviewScreen({ selectedCase, onBack }: CaseReviewScreenProps) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confidencePercent = `${(selectedCase.confidence * 100).toFixed(1)}%`;
  const caseIdShort = `${selectedCase.id.substring(0, 8)}...`;
  const submittedOn = new Date(selectedCase.created_at).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSubmitReview = async () => {
    if (!doctorNotes.trim() || !finalDiagnosis.trim()) {
      Alert.alert('Missing Information', 'Please provide both doctor notes and a final diagnosis.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDoctorReview(selectedCase.id, doctorNotes, finalDiagnosis);
      Alert.alert('Success', 'Case reviewed successfully!');
      onBack();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Review Case</Text>
            <Text style={styles.subtitle}>Case ID: {caseIdShort}</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prediction</Text>
                <Text style={styles.summaryValue}>{selectedCase.prediction}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>AI Confidence</Text>
                <Text style={styles.summaryValuePrimary}>{confidencePercent}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Submitted On</Text>
                <Text style={styles.summaryValue}>{submittedOn}</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Doctor Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter your detailed notes here..."
                placeholderTextColor={colors.textPlaceholder}
                multiline
                value={doctorNotes}
                onChangeText={setDoctorNotes}
              />
              <Text style={styles.helperText}>{doctorNotes.trim().length} characters</Text>

              <Text style={styles.inputLabel}>Final Diagnosis</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter final diagnosis (e.g., 'Benign Nevus')"
                placeholderTextColor={colors.textPlaceholder}
                value={finalDiagnosis}
                onChangeText={setFinalDiagnosis}
              />

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmitReview}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
                onPress={onBack}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.disclaimer}>
              Ensure all information is accurate before submission.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE6F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  summaryValuePrimary: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FCFDFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E3F8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  helperText: {
    marginBottom: 10,
    fontSize: 12,
    color: colors.textTertiary,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: colors.secondaryButtonBg,
    borderWidth: 1,
    borderColor: colors.secondaryButtonBorder,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
