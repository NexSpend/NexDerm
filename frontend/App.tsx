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
import { supabase } from './src/services/supabase';
import * as ImagePicker from "expo-image-picker";
import AuthScreen from './src/pages/AuthScreen';
import InferencePage from './src/pages/InferencePage';
import DermatologistMapScreen from './src/pages/DermatologistMapScreen';
import AccountDrawer from './src/pages/AccountDrawer';
import ProfilePage from './src/pages/ProfilePage';
import HistoryPage from './src/pages/HistoryPage';
import ChangePasswordPage from './src/pages/ChangePasswordPage';
import AccountButton from './src/pages/AccountButton';
import DoctorDashboard from './src/pages/DoctorDashboard';
import { commonStyles } from './src/utils/commonStyles';
import { uploadImage } from './src/services/api';
import LoadingScreen from "./src/pages/LoadingScreen";

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showInference, setShowInference] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [userName, setUserName] = useState('User');
  const [showDermatologistMap, setShowDermatologistMap] = useState(false);

  const panResponderRef = useRef<any>(null);

  useEffect(() => {
    // IMPORTANT:
    // Do not auto-log the user into the app just because Supabase has a session.
    // Otherwise signInWithPassword() will bypass your custom OTP/MFA step.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsGuest(false);
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const resetNavigationState = () => {
    setShowAccount(false);
    setShowProfile(false);
    setShowHistory(false);
    setShowChangePassword(false);
    setShowDermatologistMap(false);
    setShowInference(false);
    setImage(null);
    setInferenceResult(null);
    setUserRole(null);
  };

  const handleBackToSignup = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }

    setIsAuthenticated(false);
    setIsGuest(false);
    resetNavigationState();
  };

  const handleGoToAuthPage = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }

    setIsAuthenticated(false);
    setIsGuest(false);
    resetNavigationState();
  };

  const handleGuestBlockedFeature = (featureName: string) => {
    Alert.alert(
      'Sign Up Required',
      `Please sign up or log in to access ${featureName}.`
    );
  };

  const handleShowProfile = () => {
    if (isGuest) {
      handleGuestBlockedFeature('your profile');
      return;
    }

    setShowAccount(false);
    setShowProfile(true);
  };

  const handleShowHistory = () => {
    if (isGuest) {
      handleGuestBlockedFeature('your history');
      return;
    }

    setShowAccount(false);
    setShowHistory(true);
  };

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

        if (
          gestureState.dx > swipeThreshold &&
          gestureState.vx > swipeVelocity
        ) {
          handleBackToSignup();
        }
      },
    });
  };

  useEffect(() => {
    if (!panResponderRef.current) {
      panResponderRef.current = createSwipeGestureHandler();
    }
  }, []);

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

  const handleStartDetection = async () => {
    if (!image) {
      Alert.alert("No Image", "Please upload an image first.");
      return;
    }

    try {
      setIsLoading(true);

      const MIN_TIME = 2500;
      const start = Date.now();
      const predictionPromise = uploadImage(image);

      const result = await predictionPromise;
      const elapsed = Date.now() - start;

      if (elapsed < MIN_TIME) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_TIME - elapsed)
        );
      }

      setInferenceResult(result);
      setShowInference(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to process image");
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

  if (!isAuthenticated && !isGuest) {
    return (
      <AuthScreen
        onAuthSuccess={(role) => {
          setIsAuthenticated(true);
          setIsGuest(false);
          setUserRole(role);
        }}
        onGuestContinue={() => {
          setIsGuest(true);
          setIsAuthenticated(false);
          setUserRole(null);
        }}
      />
    );
  }

  if (showProfile) {
    return (
      <ProfilePage
        isGuest={isGuest}
        onBackToAccount={() => {
          setShowProfile(false);
          setShowAccount(true);
        }}
        onShowChangePassword={() => {
          if (isGuest) {
            handleGuestBlockedFeature('password settings');
            return;
          }

          setShowProfile(false);
          setShowChangePassword(true);
        }}
      />
    );
  }

  if (showChangePassword) {
    return (
      <ChangePasswordPage
        onBackToProfile={() => {
          setShowChangePassword(false);
          setShowProfile(true);
        }}
      />
    );
  }

  if (showHistory) {
    return (
      <HistoryPage
        isGuest={isGuest}
        onBackToAccount={() => {
          setShowHistory(false);
          setShowAccount(true);
        }}
      />
    );
  }

  if (isAuthenticated && userRole === 'doctor') {
    return (
      <DoctorDashboard
        onLogout={handleBackToSignup}
      />
    );
  }

  if (isLoading) {
    return (
      <>
        <LoadingScreen
          onAccountPress={() => setShowAccount(true)}
          userName={userName}
        />
        <AccountDrawer
          isVisible={showAccount}
          onClose={() => setShowAccount(false)}
          onSignOut={handleBackToSignup}
          onShowProfile={handleShowProfile}
          onShowHistory={handleShowHistory}
          isGuest={isGuest}
          onGoToAuthPage={handleGoToAuthPage}
        />
      </>
    );
  }

  if (showDermatologistMap) {
    return (
      <>
        <DermatologistMapScreen
          onBackToResults={() => setShowDermatologistMap(false)}
          onAccountPress={() => setShowAccount(true)}
        />
        <AccountDrawer
          isVisible={showAccount}
          onClose={() => setShowAccount(false)}
          onSignOut={handleBackToSignup}
          onShowProfile={handleShowProfile}
          onShowHistory={handleShowHistory}
          isGuest={isGuest}
          onGoToAuthPage={handleGoToAuthPage}
        />
      </>
    );
  }

  if (showInference && image && inferenceResult) {
    return (
      <>
        <InferencePage
          imageUri={image}
          result={inferenceResult}
          isGuest={isGuest}
          onShowProfile={handleShowProfile}
          onShowHistory={handleShowHistory}
          onFindDermatologists={() => setShowDermatologistMap(true)}
          onBackToUpload={handleBackToUpload}
          onAccountPress={() => setShowAccount(true)}
        />
        <AccountDrawer
          isVisible={showAccount}
          onClose={() => setShowAccount(false)}
          onSignOut={handleBackToSignup}
          onShowProfile={handleShowProfile}
          onShowHistory={handleShowHistory}
          isGuest={isGuest}
          onGoToAuthPage={handleGoToAuthPage}
        />
      </>
    );
  }

  return (
    <>
      <SafeAreaView
        style={commonStyles.container}
        {...(panResponderRef.current?.panHandlers || {})}
      >
        <AccountButton
          onPress={() => setShowAccount(true)}
          userName={userName}
        />

        <View style={commonStyles.header}>
          <Text style={commonStyles.title}>🩺 NexDerm</Text>
          <Text style={commonStyles.subtitle}>AI-Powered Skin Lesion Detection</Text>
        </View>

        <View style={commonStyles.body}>
          <View style={[commonStyles.imageBox, commonStyles.imageBoxDashed]}>
            {image ? (
              <Image source={{ uri: image }} style={commonStyles.previewImage} />
            ) : (
              <Text style={commonStyles.previewPlaceholder}>Preview</Text>
            )}
          </View>

          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={pickImage}
          >
            <Text style={commonStyles.buttonText}>
              {image ? "Change Image" : "Upload Image"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.primaryButton, { marginTop: 12 }]}
            onPress={takePhoto}
          >
            <Text style={commonStyles.buttonText}>Take a Photo</Text>
          </TouchableOpacity>

          {image && (
            <TouchableOpacity
              style={commonStyles.secondaryButton}
              onPress={handleStartDetection}
            >
              <Text style={commonStyles.buttonText}>Start Detection</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={commonStyles.footer}>
          <Text style={commonStyles.disclaimer}>
            ⚠️ Disclaimer: This demo is for educational purposes only. Not for medical use.
          </Text>
        </View>
      </SafeAreaView>

      <AccountDrawer
        isVisible={showAccount}
        onClose={() => setShowAccount(false)}
        onSignOut={handleBackToSignup}
        onShowProfile={handleShowProfile}
        onShowHistory={handleShowHistory}
        isGuest={isGuest}
        onGoToAuthPage={handleGoToAuthPage}
      />
    </>
  );
}

const styles = StyleSheet.create({});