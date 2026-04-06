// AccountScreen.tsx

// Imports
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { getMedicalHistory } from '../services/api';
import { supabase } from '../services/supabase';

/**
This file creates the Account Screen component. It allows users to view their account information 
and their medical history of diagnoses. Users can switch between the "Account Info" and "Medical History" tabs to see their details.
This page also provides a sign-out button for users.
@property {function} onBackToMain - Callback to navigate the user back to the main dashboard.
 */
interface AccountScreenProps {
  onBackToMain: () => void;
}

interface UserInfo {
  full_name: string;
  email: string;
}

interface MedicalHistoryItem {
  id: string;
  diagnosis: string;
  date: string;
  confidence: number;
  notes?: string;
}

/**
Final Component Export 
 */
export default function AccountScreen({ onBackToMain }: AccountScreenProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    loadAccountData();
  }, []);

/**
Retrieves user session data from Supabase and medical history from the API.
Handles string formatting for names.
*/
  const loadAccountData = async () => {
    try {
      setIsLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (user) {
        const fullName =
          user.user_metadata?.full_name ||
          [
            user.user_metadata?.first_name,
            user.user_metadata?.last_name,
          ]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          'Not provided';

        setUserInfo({
          email: user.email ?? 'No email available',
          full_name: fullName,
        });
      } else {
        setUserInfo(null);
      }
      
      // Fetch medical history from the backend API
      const historyData = await getMedicalHistory();
      setMedicalHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('Failed to load account data:', error);
      Alert.alert('Error', 'Failed to load account information');
      setUserInfo(null);
      setMedicalHistory([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sign out function with confirmation alert
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;

              onBackToMain();
              Alert.alert('Success', 'Signed out successfully');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToMain}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
            Account Info
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Medical History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'info' ? (
          <View style={styles.infoContainer}>
            {userInfo ? (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value}>{userInfo.email}</Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.label}>Full Name</Text>
                  <Text style={styles.value}>{userInfo.full_name}</Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No account information available</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {medicalHistory.length > 0 ? (
              medicalHistory.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyDiagnosis}>{item.diagnosis}</Text>
                  <Text style={styles.historyConfidence}>
                    Confidence: {(item.confidence * 100).toFixed(1)}%
                  </Text>
                  {item.notes ? (
                    <Text style={styles.historyNotes}>{item.notes}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No medical history yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Styles specific to the AccountScreen Page
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  infoContainer: {
    paddingBottom: 24,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  historyContainer: {
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  historyDiagnosis: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  historyConfidence: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  historyNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  signOutButton: {
    backgroundColor: colors.errorText,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});