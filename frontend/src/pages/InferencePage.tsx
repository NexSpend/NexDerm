import React from 'react';
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
import * as Location from 'expo-location';
import { commonStyles, colors } from '../utils/commonStyles';

interface InferencePageProps {
  imageUri: string;
  onFindDermatologists?: () => Promise<void>;
  onBackToUpload: () => void;
}

export default function InferencePage({ 
  imageUri, 
  onFindDermatologists,
  onBackToUpload 
}: InferencePageProps) {
  const inferenceResult = {
    condition: "Melanoma",
    confidence: 87.5,
    description: "A type of skin cancer that develops from melanocytes.",
    severity: "High Risk",
    recommendations: [
      "Consult a dermatologist immediately",
      "Avoid sun exposure",
      "Monitor for changes in size or color"
    ]
  };

  const handleFindDermatologists = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required to find nearby dermatologists.");
        return;
      }

      // Get user's current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Open Google Maps with user's location
      const googleMapsUrl = `https://www.google.com/maps/search/dermatologist/@${latitude},${longitude},15z`;
      await Linking.openURL(googleMapsUrl);
    } catch (error) {
      Alert.alert("Error", "Failed to open maps. Please try again.");
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
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
            <Text style={styles.conditionName}>{inferenceResult.condition}</Text>
            
            {/* Confidence Score */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>Confidence</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[styles.confidenceFill, { width: `${inferenceResult.confidence}%` }]} 
                />
              </View>
              <Text style={styles.confidenceText}>
                {inferenceResult.confidence.toFixed(1)}%
              </Text>
            </View>

            {/* Severity */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>Risk Level</Text>
              <View style={styles.severityBadge}>
                <Text style={styles.severityText}>{inferenceResult.severity}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>About this condition</Text>
              <Text style={styles.description}>{inferenceResult.description}</Text>
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={commonStyles.sectionLabel}>Recommendations</Text>
              {inferenceResult.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity 
            style={[commonStyles.secondaryButton, styles.buttonFull]} 
            onPress={onFindDermatologists || handleFindDermatologists}
          >
            <Text style={commonStyles.buttonText}>🏥 Find Dermatologists Near You</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[commonStyles.tertiaryButton, styles.buttonFull]} 
            onPress={onBackToUpload}
          >
            <Text style={commonStyles.buttonTextSecondary}>← Upload Another Image</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={commonStyles.footer}>
        <Text style={commonStyles.disclaimer}>
          ⚠️ Disclaimer: This is an AI prediction. Please consult a medical professional for diagnosis.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Only page-specific styles remain
const styles = StyleSheet.create({
  bodyPadding: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  conditionName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 20,
  },
  confidenceBar: {
    width: "100%",
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  confidenceText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "right",
  },
  severityBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.errorBg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  severityText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.errorText,
  },
  description: {
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 8,
    fontWeight: "700",
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  buttonFull: {
    width: "100%",
    maxWidth: 400,
    marginTop: 0,
    marginBottom: 12,
  },
});