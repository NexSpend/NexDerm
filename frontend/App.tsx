import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import ResultsScreen from "./src/pages/Results";

const Stack = createStackNavigator();

function HomeScreen({ navigation }: any) {
  // Holds the selected image URI (null = none yet)
  const [image, setImage] = useState<string | null>(null);

  // Opens the gallery picker and updates 'image'
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Denied", "Please allow photo access to upload.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,     // simple crop UI
      aspect: [1, 1],          // square
      quality: 1,              // best quality
    });

    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // Simulate detection (replace with backend call later)
  const handleStartDetection = () => {
    if (!image) {
      Alert.alert("No Image", "Please upload an image first.");
      return;
    }
    // Navigate to results screen with the image
    navigation.navigate("Results", { imageUri: image });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER — pinned to top */}
      <View style={styles.header}>
        <Text style={styles.title}>🩺 NexDerm</Text>
        <Text style={styles.subtitle}>AI-Powered Skin Lesion Detection</Text>
      </View>

      {/* BODY — center content */}
      <View style={styles.body}>
        {/* Preview box: dashed border; shows image or 'Preview' placeholder */}
        <View style={styles.previewBox}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <Text style={styles.previewPlaceholder}>Preview</Text>
          )}
        </View>

        {/* Upload / Change Image button (text switches based on state) */}
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.buttonText}>{image ? "Change Image" : "Upload Image"}</Text>
        </TouchableOpacity>

        {/* Start Detection only when an image exists */}
        {image && (
          <TouchableOpacity style={styles.detectButton} onPress={handleStartDetection}>
            <Text style={styles.buttonText}>Start Detection</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FOOTER — disclaimer at bottom */}
      <View style={styles.footer}>
        <Text style={styles.disclaimer}>
          ⚠️ Disclaimer: This demo is for educational purposes only. Not for medical use.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Root container fills screen; we split space with header/body/footer
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },

  /* HEADER (top) */
  header: {
    alignItems: "center",
    paddingTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#004aad",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563",
  },

  /* BODY (center) */
  body: {
    flex: 1, // takes remaining space between header & footer
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  previewBox: {
    width: 280,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
    // soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  previewPlaceholder: {
    color: "#9ca3af",
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  uploadButton: {
    backgroundColor: "#004aad",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  detectButton: {
    backgroundColor: "#007b83",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },

  /* FOOTER (bottom) */
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
