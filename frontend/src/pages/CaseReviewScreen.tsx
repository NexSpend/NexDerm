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
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { PendingCase, submitDoctorReview } from '../services/api';

// Define props for the CaseReviewScreen component
interface CaseReviewScreenProps {
  selectedCase: PendingCase; // The case object to be reviewed
  onBack: () => void; // Callback function to navigate back to the dashboard
}

/**
 * CaseReviewScreen Component
 * Allows a doctor to review a selected pending case, add notes,
 * provide a final diagnosis, and submit the review.
 */
export default function CaseReviewScreen({ selectedCase, onBack }: CaseReviewScreenProps) {
  const [doctorNotes, setDoctorNotes] = useState(''); // State for doctor's notes
  const [finalDiagnosis, setFinalDiagnosis] = useState(''); // State for final diagnosis
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submission

  // Handle the submission of the doctor's review
  const handleSubmitReview = async () => {
    if (!doctorNotes.trim() || !finalDiagnosis.trim()) {
      Alert.alert('Missing Information', 'Please provide both doctor notes and a final diagnosis.');
      return;
    }

    setIsSubmitting(true); // Set submitting state to true
    try {
      // Call the API to submit the review
      await submitDoctorReview(selectedCase.id, doctorNotes, finalDiagnosis);
      Alert.alert('Success', 'Case reviewed successfully!');
      onBack(); // Navigate back to the dashboard after successful submission
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false); // Reset submitting state
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={commonStyles.flex}
      >
        <ScrollView contentContainerStyle={commonStyles.scrollContent}>
          {/* Header Section */}
          <View style={commonStyles.header}>
            <Text style={commonStyles.title}>Review Case</Text>
            <Text style={commonStyles.subtitle}>Case ID: {selectedCase.id.substring(0, 8)}...</Text>
          </View>

          {/* Body Section - Case Details and Input Fields */}
          <View style={commonStyles.body}>
            <View style={commonStyles.card}>
              <Text style={commonStyles.reviewDetailText}>
                AI Prediction: <Text style={commonStyles.caseCardConfidence}>{selectedCase.prediction}</Text>
              </Text>
              <Text style={commonStyles.reviewDetailText}>
                AI Confidence: <Text style={commonStyles.caseCardConfidence}>{(selectedCase.confidence * 100).toFixed(2)}%</Text>
              </Text>
              <Text style={commonStyles.reviewDetailText}>
                Submitted On: {new Date(selectedCase.created_at).toLocaleString()}
              </Text>

              {/* Doctor Notes Input */}
              <Text style={commonStyles.inputLabel}>Doctor Notes</Text>
              <TextInput
                style={[commonStyles.reviewTextInput, commonStyles.reviewTextInputMultiline]}
                placeholder="Enter your detailed notes here..."
                placeholderTextColor={colors.textPlaceholder}
                multiline
                value={doctorNotes}
                onChangeText={setDoctorNotes}
              />

              {/* Final Diagnosis Input */}
              <Text style={commonStyles.inputLabel}>Final Diagnosis</Text>
              <TextInput
                style={commonStyles.reviewTextInput}
                placeholder="Enter final diagnosis (e.g., 'Benign Nevus')"
                placeholderTextColor={colors.textPlaceholder}
                value={finalDiagnosis}
                onChangeText={setFinalDiagnosis}
              />

              {/* Action Buttons */}
              <TouchableOpacity style={commonStyles.primaryButton} onPress={handleSubmitReview} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={commonStyles.buttonText}>Submit Review</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={commonStyles.backButtonReview} onPress={onBack} disabled={isSubmitting}>
                <Text style={commonStyles.backButtonReviewText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Section */}
          <View style={commonStyles.footer}>
            <Text style={commonStyles.disclaimer}>
              Ensure all information is accurate before submission.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
