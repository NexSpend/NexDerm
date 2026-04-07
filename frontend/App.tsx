// importing components and libraries
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

/**
The Root Application Component for NexDerm.
Acts as the primary navigation controller and global state manager. 
It handles the user's authentication session, dictates whether they see the patient 
dashboard or doctor dashboard, and manages the flow of the image upload/inference process.
@returns {JSX.Element} The rendered active screen based on current state.
*/
export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null); 
  const [isGuest, setIsGuest] = useState(false); // To track if the user is in guest mode
  const [showInference, setShowInference] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For showing loading screen during inference
  const [showAccount, setShowAccount] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [userName, setUserName] = useState('User');
  const [showDermatologistMap, setShowDermatologistMap] = useState(false);

/**
Synchronizes the user's display name from Supabase.
*/
  const syncUserName = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setUserName('User');
        return;
      }
      // Pulling name from Metadata
      const metadataName =
        user.user_metadata?.full_name ||
        [user.user_metadata?.first_name, user.user_metadata?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();

      if (metadataName) {
        setUserName(metadataName);
        return;
      }

      // Pulling name from Supabase 
      const { data: profileData, error: profileError } = await supabase
        .from('newUsers')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        const fallbackName = user.email?.split('@')[0] || 'User';
        setUserName(fallbackName);
        return;
      }

      const displayName = profileData?.full_name?.trim() || user.email?.split('@')[0] || 'User';
      setUserName(displayName);
    } catch {
      setUserName('User');
    }
  };

  const panResponderRef = useRef<any>(null);

  useEffect(() => {
    // IMPORTANT:
    // Do not auto-log the user into the app just because Supabase has a session.
    // Otherwise signInWithPassword() will bypass the OTP/MFA step.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsGuest(false);
        setUserRole(null);
        setUserName('User');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        syncUserName();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      syncUserName();
    }
  }, [isAuthenticated, isGuest]);

/**
Resets all navigation flags and volatile state to their default false/null values.
*/
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

/**
Handles user sign-out by terminating the Supabase session and resetting global state.
*/
  const handleBackToSignup = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }

    setIsAuthenticated(false);
    setIsGuest(false);
    setUserName('User');
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
    setUserName('User');
    resetNavigationState();
  };

/**
Helper to display an alert block for guest users trying to access protected routes.
@param {string} featureName - The name of the feature being blocked.
*/
  const handleGuestBlockedFeature = (featureName: string) => {
    Alert.alert(
      'Sign Up Required',
      `Please sign up or log in to access ${featureName}.`
    );
  };

// Blocks guest access to profile page
  const handleShowProfile = () => {
    if (isGuest) {
      handleGuestBlockedFeature('your profile');
      return;
    }

    setShowAccount(false);
    setShowProfile(true);
  };

// Blocks guest access to history page
  const handleShowHistory = () => {
    if (isGuest) {
      handleGuestBlockedFeature('your history');
      return;
    }

    setShowAccount(false);
    setShowHistory(true);
  };

/**
* Creates a pan responder to handle global swipe gestures.
*/
  const createSwipeGestureHandler = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => 
        Math.abs(gestureState.dx) > 10 && gestureState.vx > 0.5,
      onPanResponderRelease: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => { 
        // Set to standard thresholds for swipe detection on mobile
        const swipeThreshold = 50;
        const swipeVelocity = 0.5;

        // Detect right swipe to go back to signup/auth page
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

/**
Requests media library permissions and opens the device's photo gallery.
*/
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

/**
Requests device camera permissions and opens the device's camera.
*/
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

/**
Submits the captured image to the FastAPI backend for ML inference. 
Displays a loading screen while waiting for the response. 
*/
  const handleStartDetection = async () => {
    if (!image) {
      Alert.alert("No Image", "Please upload an image first.");
      return;
    }

    try {
      setIsLoading(true);

      // Minimum wait time to display loading screen for smoother UX
      const MIN_TIME = 2500; // 2.5 seconds
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


// --- Render Tree based on State ---

  if (!isAuthenticated && !isGuest) {
    return (
      // Login Page 
      <AuthScreen
        onAuthSuccess={async (role) => {
          setIsAuthenticated(true);
          setIsGuest(false);
          setUserRole(role);
          await syncUserName();
        }}
        // Guest Access Handler
        onGuestContinue={() => {
          setIsGuest(true);
          setIsAuthenticated(false);
          setUserRole(null);
          setUserName('Guest');
        }}
      />
    );
  }

  // Profile / Account Settings Page
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

  // History Page
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

  // Doctor Dashboard (only accessible to authenticated users with doctor role)
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

  // Dermatologists Map Page
  if (showDermatologistMap) {
    return (
      <>
        <DermatologistMapScreen
          onBackToResults={() => setShowDermatologistMap(false)}
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

  // Inference and Results Page
  if (showInference && image && inferenceResult) {
    return (
      <>
        <InferencePage
          imageUri={image}
          result={inferenceResult}
          isGuest={isGuest}
          userName={userName}
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

// Final Visual Layout
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
        {/* Header Section with App Title and Subtitle */}
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
            style={[commonStyles.primaryButton, styles.uploadActionButton]}
            onPress={pickImage}
          >
            <Text style={commonStyles.buttonText}>
              {image ? "Change Image" : "Upload Image"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.primaryButton, styles.uploadActionButton, { marginTop: 12 }]}
            onPress={takePhoto}
          >
            <Text style={commonStyles.buttonText}>Take a Photo</Text>
          </TouchableOpacity>

          {image && (
            <TouchableOpacity
              style={[commonStyles.secondaryButton, styles.uploadActionButton]}
              onPress={handleStartDetection}
            >
              <Text style={commonStyles.buttonText}>Start Detection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Section with Disclaimer */}

        <View style={commonStyles.footer}>
          <Text style={commonStyles.disclaimer}>
            ⚠️ Disclaimer: This demo is for educational purposes only. Not for medical use.
          </Text>
        </View>
      </SafeAreaView>

      {/* Account Drawer (accessible from all main screens)*/}
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

// Local styles specific to this component
// Put here to force width constraint on only upload button
const styles = StyleSheet.create({
  uploadActionButton: {
    width: 280,
  },
});