import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Linking,
} from "react-native";
import * as Location from "expo-location";

interface AnalysisResult {
  condition: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  recommendations: string[];
  description: string;
}

const SEVERITY_COLORS = {
  low: "#4CAF50",
  medium: "#FFC107",
  high: "#FF9800",
  critical: "#F44336",
};

const SEVERITY_TEXT = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  critical: "Critical - Seek Medical Attention",
};

export default function ResultsScreen({ route, navigation }: any) {
  const { imageUri } = route.params || {};
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate analysis delay
    const timer = setTimeout(() => {
      // Mock analysis result - Replace with actual backend API call
      const mockResult: AnalysisResult = {
        condition: "Suspected Melanoma",
        confidence: 0.87,
        severity: "high",
        recommendations: [
          "Consult with a dermatologist immediately",
          "Avoid direct sun exposure",
          "Apply sunscreen SPF 50+",
          "Monitor for changes in size or appearance",
        ],
        description:
          "The analyzed image shows characteristics that may indicate melanoma. However, this is not a medical diagnosis. Please consult a qualified dermatologist for professional evaluation and treatment.",
      };
      setResult(mockResult);
      setLoading(false);
    }, 2000); // 2 second simulated analysis time

    return () => clearTimeout(timer);
  }, []);

  const handleFindDermatologist = async () => {
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

  const handleNewAnalysis = () => {
    navigation.navigate("Home");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size={50} color="#004aad" />
          <Text style={styles.loadingText}>Analyzing your image...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Analysis Failed</Text>
          <TouchableOpacity style={styles.button} onPress={handleNewAnalysis}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (navigation && navigation.goBack) {
              navigation.goBack();
            }
          }} 
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.resultImage} />
          </View>
        )}

        {/* Condition Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detected Condition</Text>
          <Text style={styles.conditionName}>{result.condition}</Text>

          {/* Severity Badge */}
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: SEVERITY_COLORS[result.severity] },
            ]}
          >
            <Text style={styles.severityText}>{SEVERITY_TEXT[result.severity]}</Text>
          </View>

          {/* Confidence */}
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence Level:</Text>
            <Text style={styles.confidenceValue}>{(result.confidence * 100).toFixed(0)}%</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${result.confidence * 100}%`,
                    backgroundColor: SEVERITY_COLORS[result.severity],
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Description Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Analysis Description</Text>
          <Text style={styles.description}>{result.description}</Text>
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              ⚠️ This analysis is for educational purposes only and should not be used as a medical diagnosis. Please consult with a licensed dermatologist.
            </Text>
          </View>
        </View>

        {/* Recommendations Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommendations</Text>
          {result.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationBullet}>•</Text>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.dermatologistButton} onPress={handleFindDermatologist}>
            <Text style={styles.buttonText}>Find Dermatologist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dermatologistButton, styles.secondaryButton]}
            onPress={handleNewAnalysis}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>New Analysis</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#004aad",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F44336",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#004aad",
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#004aad",
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultImage: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#004aad",
    marginBottom: 12,
  },
  conditionName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  severityBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  severityText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  confidenceContainer: {
    marginTop: 12,
  },
  confidenceLabel: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004aad",
    marginBottom: 8,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  disclaimerBox: {
    backgroundColor: "#FFF3CD",
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#856404",
    lineHeight: 16,
  },
  recommendationItem: {
    flexDirection: "row",
    marginBottom: 12,
    paddingVertical: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: "#004aad",
    marginRight: 12,
    fontWeight: "bold",
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  dermatologistButton: {
    backgroundColor: "#004aad",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: "#f0f7ff",
    borderWidth: 2,
    borderColor: "#004aad",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#004aad",
  },
  button: {
    backgroundColor: "#004aad",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  spacer: {
    height: 20,
  },
});
