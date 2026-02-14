import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AuthScreen from './src/pages/AuthScreen';
import InferencePage from './src/pages/InferencePage';
import DermatologistMapScreen from './src/pages/DermatologistMapScreen';
import { commonStyles, colors } from './src/utils/commonStyles';
import { uploadImage } from './src/services/api';
import LoadingScreen from "./src/pages/LoadingScreen";

// All the imports
export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showInference, setShowInference] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDermatologistMap, setShowDermatologistMap] = useState(false);


  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Denied", "Please allow photo access to upload.");
      return;
    }
// Launches expo's image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) setImage(result.assets[0].uri);
  };
// Handles the image upload and inference process
  const handleStartDetection = async () => {
    if (!image) {
      Alert.alert("No Image", "Please upload an image first.");
      return;
    }

    try {
      setIsLoading(true);

      const MIN_TIME = 2500; // 2.5 seconds minimum
      const start = Date.now();
      const predictionPromise = uploadImage(image);

      // Wait for backend result
      const result = await predictionPromise;

      const elapsed = Date.now() - start;

      // If backend was too fast, wait extra time
      if (elapsed < MIN_TIME) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_TIME - elapsed)
        );
      }

      setInferenceResult(result);
      setShowInference(true);

    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to process image. Please try again."
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindDermatologists = () => {
    Alert.alert(
      "Find Dermatologists",
      "This feature will show nearby dermatologists. Coming soon!"
    );
  };

  const handleBackToUpload = () => {
    setShowInference(false);
    setImage(null);
    setInferenceResult(null);
  };

  if (!isAuthenticated && !isGuest) {
    return (
      <AuthScreen
        onAuthSuccess={() => setIsAuthenticated(true)}
        onGuestContinue={() => setIsGuest(true)}
      />
    );
  }
  if (isLoading) {
    return <LoadingScreen />;
  }
  if (showDermatologistMap) {
    return (
      <DermatologistMapScreen
        onBackToResults={() => setShowDermatologistMap(false)}
      />
    );
  }
  if (showInference && image && inferenceResult) {
    return (
      <InferencePage
        imageUri={image}
        result={inferenceResult}
        onFindDermatologists={() => setShowDermatologistMap(true)}
        onBackToUpload={handleBackToUpload}
      />
    );
  }
// Main upload screen
  return (
    <SafeAreaView style={commonStyles.container}>
      {/* HEADER */}
      <View style={commonStyles.header}>
        <Text style={commonStyles.title}>🩺 NexDerm</Text>
        <Text style={commonStyles.subtitle}>AI-Powered Skin Lesion Detection</Text>
      </View>

      {/* BODY */}
      <View style={commonStyles.body}>
        <View style={[commonStyles.imageBox, commonStyles.imageBoxDashed]}>
          {image ? (
            <Image source={{ uri: image }} style={commonStyles.previewImage} />
          ) : (
            <Text style={commonStyles.previewPlaceholder}>Preview</Text>
          )}
        </View>

        <TouchableOpacity style={commonStyles.primaryButton} onPress={pickImage}>
          <Text style={commonStyles.buttonText}>
            {image ? "Change Image" : "Upload Image"}
          </Text>
        </TouchableOpacity>

        {image && (
          <TouchableOpacity style={commonStyles.secondaryButton} onPress={handleStartDetection}>
            <Text style={commonStyles.buttonText}>Start Detection</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FOOTER */}
      <View style={commonStyles.footer}>
        <Text style={commonStyles.disclaimer}>
          ⚠️ Disclaimer: This demo is for educational purposes only. Not for medical use.
        </Text>
      </View>
    </SafeAreaView>
  );
}
