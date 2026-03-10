import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AccountButton from './AccountButton';
import Sidebar from './Sidebar';
import { commonStyles, colors } from '../utils/commonStyles';
import { useUser } from '../context/UserContext';
import { changePassword } from '../services/api';

interface ChangePasswordPageProps {
  userEmail?: string;
  onBackToProfile: () => void;
}

export default function ChangePasswordPage({
  userEmail = "user@example.com",
  onBackToProfile,
}: ChangePasswordPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const handleLogout = () => {
    setSidebarOpen(false);
    onBackToProfile();
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Validation", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Validation", "New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Validation", "New passwords do not match");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User information not found");
      return;
    }

    setLoading(true);
    try {
      await changePassword(user.id, currentPassword, newPassword, confirmPassword);
      Alert.alert("Success", "Password changed successfully", [
        { text: "OK", onPress: onBackToProfile }
      ]);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to change password. Please try again.";
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        Alert.alert("Error", "Current password is incorrect");
      } else {
        Alert.alert("Error", errorMessage);
      }
      console.error("Error changing password:", error);
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={commonStyles.title}>Change Password</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* BODY */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={commonStyles.body}>
            {/* Form Card */}
            <View style={commonStyles.cardWide}>
              <Text style={commonStyles.sectionLabel}>Update Your Password</Text>

              {/* Current Password */}
              <View style={styles.section}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textPlaceholder}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIcon}>
                      {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.section}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textPlaceholder}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIcon}>
                      {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>
                  Must be at least 8 characters
                </Text>
              </View>

              {/* Confirm Password */}
              <View style={styles.section}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textPlaceholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIcon}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Button Row */}
            <View style={styles.buttonRowContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onBackToProfile}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.updateButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.textDark,
    fontWeight: '500',
  },
  eyeIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  buttonRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.secondaryButtonBg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.secondaryButtonBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },
  updateButton: {
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
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});
