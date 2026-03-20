import React, { useEffect, useState } from 'react';
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
import { commonStyles, colors } from '../utils/commonStyles';
import { getUserInfo } from '../services/api';

interface ProfilePageProps {
  onBackToAccount: () => void;
  onShowChangePassword: () => void;
}

interface UserInfo {
  full_name: string;
  email: string;
}

export default function ProfilePage({
  onBackToAccount,
  onShowChangePassword,
}: ProfilePageProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await getUserInfo();
      console.log('USER INFO:', data);  
      setUserInfo(data);
    } catch (error) {
      console.error('Failed to load user info:', error);
      Alert.alert('Error', 'Failed to load profile information');
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToAccount}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        {/* Empty view to keep header spacing balanced */}
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileContainer}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
            </View>
          </View>

          {/* View-Only Fields */}
          <View style={styles.fieldsSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
                <Text style={styles.fieldValue}>
                  {userInfo?.full_name || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={[styles.fieldInput, styles.fieldInputDisabled]}>
                <Text style={styles.fieldValue}>
                  {userInfo?.email || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={onShowChangePassword}
          >
            <Text style={styles.changePasswordButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerRightPlaceholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  profileContainer: {
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 40,
  },
  fieldsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  fieldInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldInputDisabled: {
    backgroundColor: colors.background,
  },
  fieldValue: {
    fontSize: 14,
    color: colors.text,
  },
  changePasswordButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changePasswordButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});