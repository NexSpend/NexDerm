// ProfilePage.tsx

// Imports
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { supabase } from '../services/supabase';

/**
This screen displays the user's profile information, including their name and email.
User can navigate to this page from the Account Drawer. 
If the user is a guest, they will be prompted to sign up or log in to access their profile.
@property {boolean} isGuest - Indicates if the user is a guest.
@property {() => void} onBackToAccount - Callback for navigating back to the account screen.
@property {() => void} onShowChangePassword - Callback for showing the change password screen.
 */
interface ProfilePageProps {
  isGuest: boolean;
  onBackToAccount: () => void;
  onShowChangePassword: () => void;
}

interface UserInfo {
  full_name: string;
  email: string;
}

// Main Component Export
export default function ProfilePage({
  isGuest,
  onBackToAccount,
  onShowChangePassword,
}: ProfilePageProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const getInitials = (name?: string, email?: string) => {
    const trimmedName = (name || '').trim();
    if (trimmedName && trimmedName !== 'N/A') {
      const parts = trimmedName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2);
      return parts.map(part => part[0].toUpperCase()).join('');
    }

    if (email) {
      return email[0].toUpperCase();
    }

    return 'U';
  };

  useEffect(() => {
    if (isGuest) {
      Alert.alert('Sign Up Required', 'Please sign up or log in to access your profile.');
      onBackToAccount();
      return;
    }

    loadUserInfo();
  }, [isGuest]);

  const loadUserInfo = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setUserInfo(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('newUsers')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const fullName = profileData?.full_name || 'N/A';

      setUserInfo({
        full_name: fullName,
        email: user.email || 'N/A',
      });
    } catch (error) {
      console.error('Failed to load user info:', error);
      Alert.alert('Error', 'Failed to load profile information');
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      {/*  Header  */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToAccount}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.headerRightPlaceholder} />
      </View>

      {/*  Content  */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(userInfo?.full_name, userInfo?.email)}
              </Text>
            </View>
            <Text style={styles.profileName}>{userInfo?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{userInfo?.email || 'N/A'}</Text>
          </View>

          <View style={styles.fieldsSection}>
            <Text style={styles.sectionTitle}>Personal information</Text>

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
        {/*  Change Password Button  */}
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

// Styles specific to the ProfilePage
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
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 50,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  profileContainer: {
    gap: 20,
  },
  avatarSection: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fieldsSection: {
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  fieldInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInputDisabled: {
    backgroundColor: colors.inputBg,
  },
  fieldValue: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  changePasswordButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  changePasswordButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});