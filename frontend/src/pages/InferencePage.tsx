import React from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commonStyles, colors } from '../utils/commonStyles';
import { getLatestReport } from '../services/api';
import AccountButton from './AccountButton';

interface BackendResult {
  prediction: string;
  confidence: number; // can be 0–1 or 0–100
  recommendations?: string | string[];
  description?: string;
  severity?: string;
}
interface InferencePageProps {
  imageUri: string;
  result: BackendResult;
  onFindDermatologists?: () => void;
  onBackToUpload: () => void;
  onAccountPress?: () => void;
  userName?: string;
}

export default function InferencePage({
  imageUri,
  result,
  onFindDermatologists,
  onBackToUpload,
  onAccountPress,
  userName = 'User',
}: InferencePageProps) {
  // Normalize confidence to 0–100
  const confidencePercent =
    result.confidence <= 1 ? result.confidence * 100 : result.confidence;

  // Thi will derive a simple severity label if backend didn't send one
  const severity =
    result.severity ||
    (confidencePercent >= 80
      ? 'High Risk'
      : confidencePercent >= 50
      ? 'Moderate Risk'
      : 'Low Risk');

  const recommendationsArray: string[] = Array.isArray(result.recommendations)
    ? result.recommendations
    : result.recommendations
    ? result.recommendations
        .split(/\n|\. /)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const descriptionText =
    result.description ||
    'No detailed description is available. Please consult a dermatologist for further evaluation.';
  
  const handleDownloadLatestReport = async () => {
    try {
      const data = await getLatestReport();

      if (!data.download_url) {
        Alert.alert("Error", "No report available.");
        return;
      }

      const fileUri =
        FileSystem.documentDirectory +
        `nexderm-report-${Date.now()}.pdf`;

      const downloadResult = await FileSystem.downloadAsync(
        data.download_url,
        fileUri
      );

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Download NexDerm Report",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Success", "Report downloaded.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to download report.");
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Account Button */}
      {onAccountPress && <AccountButton onPress={onAccountPress} userName={userName} />}
      
      {/* HEADER */}
      <View style={commonStyles.header}>
        <Text style={commonStyles.title}>🩺 NexDerm</Text>
        <Text style={commonStyles.subtitle}>Detection Results</Text>
      </View>

      {/* BODY */}
      <ScrollView contentContainerStyle={commonStyles.scrollContent}>
        <View style={[commonStyles.body, styles.bodyPadding]}>
          {/* Image Preview */}
          <View style={commonStyles.imageBox}>
            <Image source={{ uri: imageUri }} style={commonStyles.previewImage} />
          </View>

          {/* Results Card */}
          <View style={commonStyles.cardWide}>
            <Text style={commonStyles.sectionLabel}>Detected Condition</Text>
            <Text style={styles.conditionName}>
              {result.prediction || 'Unknown Condition'}
            </Text>

            {/* Confidence Score */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>Confidence</Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    { width: `${Math.max(0, Math.min(100, confidencePercent))}%` },
                  ]}
                />
              </View>
              <Text style={styles.confidenceText}>
                {confidencePercent.toFixed(1)}%
              </Text>
            </View>

            {/* Severity */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>Risk Level</Text>
              <View style={styles.severityBadge}>
                <Text style={styles.severityText}>{severity}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>About this condition</Text>
              <Text style={styles.description}>{descriptionText}</Text>
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>Recommendations</Text>
              {recommendationsArray.length > 0 ? (
                recommendationsArray.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.recommendationItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.recommendationText}>
                    Please consult a dermatologist for personalized
                    recommendations.
                  </Text>
                </View>
              )}
            </View>
          </View>
       
    
          {/* Buttons */}

          <TouchableOpacity
            style={[commonStyles.primaryButton, styles.buttonFull]}
            onPress={handleDownloadLatestReport}
          >
            <Text style={commonStyles.buttonText}>
              📄 Download Latest Report PDF
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[commonStyles.secondaryButton, styles.buttonFull]}
            onPress={onFindDermatologists}
          >
            <Text style={commonStyles.buttonText}>
              🏥 Find Dermatologists Near You
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.tertiaryButton, styles.buttonFull]}
            onPress={onBackToUpload}
          >
            <Text style={commonStyles.buttonTextSecondary}>
              ← Upload Another Image
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={commonStyles.footer}>
        <Text style={commonStyles.disclaimer}>
          ⚠️ Disclaimer: This is an AI prediction. Please consult a medical
          professional for diagnosis.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Page specific for only InferencePage styles
const styles = StyleSheet.create({
  bodyPadding: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  conditionName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
  },
  confidenceBar: {
    width: '100%',
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'right',
  },
  severityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.errorBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.errorText,
  },
  description: {
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 8,
    fontWeight: '700',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  buttonFull: {
    width: '100%',
    maxWidth: 400,
    marginTop: 0,
    marginBottom: 12,
  },
});
