import React, { useState, useEffect } from 'react';
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
import { updateUserProfile } from '../services/api';

interface EditInformationPageProps {
  userEmail?: string;
  onBackToProfile: () => void;
}

export default function EditInformationPage({
  userEmail = "user@example.com",
  onBackToProfile,
}: EditInformationPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useUser();

  // Load current user information into the form
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleLogout = () => {
    setSidebarOpen(false);
    onBackToProfile();
  };

  const handleSaveInformation = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Validation", "Please fill in all fields");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User information not found");
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await updateUserProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
      });
      
      // Update the user context with the new data
      setUser(updatedUser);
      Alert.alert("Success", "Information updated successfully", [
        { text: "OK", onPress: onBackToProfile }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update information. Please try again.");
      console.error("Error updating user info:", error);
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
            <Text style={commonStyles.title}>Edit Information</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* BODY */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={commonStyles.body}>
            {/* Form Card */}
            <View style={commonStyles.cardWide}>
              <Text style={commonStyles.sectionLabel}>Personal Details</Text>

              {/* First Name */}
              <View style={styles.section}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your first name"
                  placeholderTextColor={colors.textPlaceholder}
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!loading}
                />
              </View>

              {/* Last Name */}
              <View style={styles.section}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your last name"
                  placeholderTextColor={colors.textPlaceholder}
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!loading}
                />
              </View>

              {/* Phone */}
              <View style={styles.section}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textPlaceholder}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>

              {/* Email (Read Only) */}
              <View style={styles.section}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>{user?.email || userEmail}</Text>
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
                style={styles.saveButton}
                onPress={handleSaveInformation}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
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
  input: {
    backgroundColor: colors.inputBg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 16,
    color: colors.textDark,
    fontWeight: '500',
  },
  readOnlyInput: {
    backgroundColor: colors.borderLight,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readOnlyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
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
  saveButton: {
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
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});
