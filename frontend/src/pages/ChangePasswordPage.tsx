import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';

interface ChangePasswordPageProps {
  onBackToProfile: () => void;
}

export default function ChangePasswordPage({ onBackToProfile }: ChangePasswordPageProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    // TODO: Call API to change password
    Alert.alert('Success', 'Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onBackToProfile();
  };

  const PasswordToggleButton = ({ show, onPress }: { show: boolean; onPress: () => void }) => (
    <TouchableOpacity style={styles.toggleButton} onPress={onPress}>
      <Text style={styles.toggleButtonText}>{show ? 'Hide' : 'Show'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToProfile}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.placeholder} />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.formContainer}>
          {/* Current Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showCurrentPassword}
              />
              <PasswordToggleButton
                show={showCurrentPassword}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              />
            </View>
          </View>

          {/* New Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showNewPassword}
              />
              <PasswordToggleButton
                show={showNewPassword}
                onPress={() => setShowNewPassword(!showNewPassword)}
              />
            </View>
          </View>

          {/* Confirm Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
              />
              <PasswordToggleButton
                show={showConfirmPassword}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </View>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity
            style={styles.changeButton}
            onPress={handleChangePassword}
          >
            <Text style={styles.changeButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  formContainer: {
    gap: 16,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  changeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  changeButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});
