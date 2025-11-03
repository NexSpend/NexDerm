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
import { commonStyles, colors } from './src/utils/commonStyles';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showInference, setShowInference] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Denied", "Please allow photo access to upload.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleStartDetection = () => {
    if (!image) {
      Alert.alert("No Image", "Please upload an image first.");
      return;
    }
    setShowInference(true);
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
  };
  
  if (!isAuthenticated && !isGuest) {
    return (
      <AuthScreen
        onAuthSuccess={() => setIsAuthenticated(true)}
        onGuestContinue={() => setIsGuest(true)}
      />
    );
  }

  if (showInference && image) {
    return (
      <InferencePage
        imageUri={image}
        onBackToUpload={handleBackToUpload}
      />
    );
  }

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

// Only page-specific styles remain
const styles = StyleSheet.create({});