import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AuthScreen from './src/pages/AuthScreen';
import InferencePage from './src/pages/InferencePage';
import DermatologistMapScreen from './src/pages/DermatologistMapScreen';
import ProfilePage from './src/pages/ProfilePage';
import EditInformationPage from './src/pages/EditInformationPage';
import ChangePasswordPage from './src/pages/ChangePasswordPage';
import AccountButton from './src/pages/AccountButton';
import Sidebar from './src/pages/Sidebar';
import { commonStyles, colors } from './src/utils/commonStyles';
import { uploadImage } from './src/services/api';
import LoadingScreen from "./src/pages/LoadingScreen";
import { UserProvider } from './src/context/UserContext';

// All the imports
function AppContent() {
  const [image, setImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showInference, setShowInference] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("user@example.com");
  const [showProfile, setShowProfile] = useState(false);
  const [showEditInformation, setShowEditInformation] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const panResponderRef = useRef<any>(null);

  // Handle back to signup with state reset
  const handleBackToSignup = () => {
    setIsAuthenticated(false);
    setIsGuest(false);
    setImage(null);
    setInferenceResult(null);
    setShowInference(false);
    setSidebarOpen(false);
    setShowProfile(false);
    setShowEditInformation(false);
    setShowChangePassword(false);
  };

  const handleLogout = () => {
    handleBackToSignup();
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
  };

  const handleBackFromEditInformation = () => {
    setShowEditInformation(false);
    setShowProfile(true);
  };

  const handleBackFromChangePassword = () => {
    setShowChangePassword(false);
    setShowProfile(true);
  };

  // Initialize swipe gesture recognizer
  const createSwipeGestureHandler = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const swipeThreshold = 50;
        const swipeVelocity = 0.5;
        
        // Detect right swipe
        if (
          gestureState.dx > swipeThreshold &&
          gestureState.vx > swipeVelocity
        ) {
          handleBackToSignup();
        }
      },
    });
  };

  // Initialize swipe responder only once
  useEffect(() => {
    if (!panResponderRef.current) {
      panResponderRef.current = createSwipeGestureHandler();
    }
  }, []);
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

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Denied", "Please allow camera access to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
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

  const handleBackToUpload = () => {
    setShowInference(false);
    setImage(null);
    setInferenceResult(null);
  };

  const handleFindDermatologists = async () => {
    Alert.alert(
      "Find Dermatologists",
      "This feature will show nearby dermatologists. Coming soon!"
    );
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
  if (showEditInformation) {
    return (
      <EditInformationPage
        userEmail={userEmail}
        onBackToProfile={handleBackFromEditInformation}
      />
    );
  }
  if (showChangePassword) {
    return (
      <ChangePasswordPage
        userEmail={userEmail}
        onBackToProfile={handleBackFromChangePassword}
      />
    );
  }
  if (showProfile) {
    return (
      <ProfilePage
        userEmail={userEmail}
        onBackToHome={handleBackFromProfile}
        onEditInformation={() => setShowEditInformation(true)}
        onChangePassword={() => setShowChangePassword(true)}
      />
    );
  }
  if (showDermatologistMap) {
    return (
      <DermatologistMapScreen
        onBackToResults={() => setShowDermatologistMap(false)}
        userEmail={userEmail}
        onProfile={() => setShowProfile(true)}
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
        userEmail={userEmail}
        onProfile={() => setShowProfile(true)}
      />
    );
  }

  // Main upload screen
  return (
    <View style={commonStyles.container}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        onLogout={handleLogout}
        onProfile={() => setShowProfile(true)}
      />
      <SafeAreaView 
        style={commonStyles.container}
        {...(panResponderRef.current?.panHandlers || {})}
      >
        {/* HEADER */}
        <View style={[commonStyles.header, styles.headerWithBack]}>
          <AccountButton
            onPress={() => setSidebarOpen(true)}
            userEmail={userEmail}
          />
          <View style={styles.headerTitleContainer}>
            <Text style={commonStyles.title}>🩺 NexDerm</Text>
            <Text style={commonStyles.subtitle}>AI-Powered Skin Lesion Detection</Text>
          </View>
          <View style={styles.backButtonPlaceholder} />
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

          <TouchableOpacity style={[commonStyles.primaryButton, { marginTop: 12 }]} onPress={takePhoto}>
            <Text style={commonStyles.buttonText}>
              Take a Photo
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
    </View>
  );
}

// Main App wrapper with UserProvider
export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

// Styles for the upload screen with account button
const styles = StyleSheet.create({
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'relative',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingLeft: -80,
  },
  backButtonPlaceholder: {
    width: 52,
  },
});

