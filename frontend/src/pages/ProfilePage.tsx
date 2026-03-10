import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AccountButton from './AccountButton';
import Sidebar from './Sidebar';
import { commonStyles, colors } from '../utils/commonStyles';
import { useUser } from '../context/UserContext';

interface ProfilePageProps {
  userEmail?: string;
  onBackToHome: () => void;
  onEditInformation?: () => void;
  onChangePassword?: () => void;
}

export default function ProfilePage({
  userEmail = "user@example.com",
  onBackToHome,
  onEditInformation,
  onChangePassword,
}: ProfilePageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    // Load profile image from user context if available
    if (user?.profile_image_url) {
      setProfileImage(user.profile_image_url);
    }
  }, [user]);

  const handleLogout = () => {
    setSidebarOpen(false);
    onBackToHome();
  };

  const handleUploadProfileImage = async () => {
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

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const displayEmail = user?.email || userEmail;
  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}`
    : 'User Profile';

  return (
    <View style={commonStyles.container}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <SafeAreaView style={commonStyles.container}>
        {/* HEADER */}
        <View style={[commonStyles.header, styles.headerWithAccount]}>
          <AccountButton
            onPress={() => setSidebarOpen(true)}
            userEmail={userEmail}
          />
          <View style={styles.headerTitleContainer}>
            <Text style={commonStyles.title}>👤 Profile</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* BODY */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={commonStyles.body}>
            {/* Profile Picture Upload */}
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={handleUploadProfileImage}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImagePlaceholderText}>+</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Profile Card */}
            <View style={commonStyles.cardWide}>
              <Text style={commonStyles.sectionLabel}>Account Information</Text>
              
              {/* Name Section */}
              {user?.first_name && user?.last_name && (
                <View style={styles.section}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>{`${user.first_name} ${user.last_name}`}</Text>
                  </View>
                </View>
              )}

              {/* Email Section */}
              <View style={styles.section}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{displayEmail}</Text>
                </View>
              </View>

              {/* Phone Section */}
              {user?.phone && (
                <View style={styles.section}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>{user.phone}</Text>
                  </View>
                </View>
              )}

              {/* Member Since */}
              <View style={styles.section}>
                <Text style={styles.label}>Member Since</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>March 2026</Text>
                </View>
              </View>
            </View>

            {/* Edit Buttons Row */}
            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEditInformation}
              >
                <Text style={styles.editButtonText}>Edit Information</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.passwordButton}
                onPress={onChangePassword}
              >
                <Text style={styles.passwordButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>

            {/* Back Button */}
            <TouchableOpacity
              style={[commonStyles.primaryButton, styles.backButton]}
              onPress={onBackToHome}
            >
              <Text style={commonStyles.buttonText}>← Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWithAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerPlaceholder: {
    width: 52,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  profileImageContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: colors.inputBg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoText: {
    fontSize: 16,
    color: colors.textDark,
    fontWeight: '500',
  },
  buttonRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  passwordButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  passwordButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  halfButton: {
    flex: 1,
  },
  backButton: {
    marginTop: 16,
  },
});
