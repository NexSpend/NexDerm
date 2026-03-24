import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { colors } from '../utils/commonStyles';
import { getMedicalHistory } from '../services/api';
import { supabase } from '../services/supabase';

interface AccountDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onShowProfile?: () => void;
  onShowHistory?: () => void;
  isGuest: boolean;
  onGoToAuthPage: () => void;
}

interface UserInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  phone?: string;
}

interface MedicalHistoryItem {
  id: string;
  diagnosis: string;
  date: string;
  confidence: number;
  notes?: string;
}

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

export default function AccountDrawer({
  isVisible,
  onClose,
  onSignOut,
  onShowProfile,
  onShowHistory,
  isGuest,
  onGoToAuthPage,
}: AccountDrawerProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      loadAccountData();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const loadAccountData = async () => {
    try {
      setIsLoading(true);

      if (isGuest) {
        setUserInfo(null);
        setMedicalHistory([]);
        setActiveTab('info');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (user) {
        setUserInfo({
          email: user.email ?? '',
          firstName: user.user_metadata?.first_name ?? user.user_metadata?.firstName,
          lastName: user.user_metadata?.last_name ?? user.user_metadata?.lastName,
          age: user.user_metadata?.age,
          gender: user.user_metadata?.gender,
          phone: user.user_metadata?.phone,
        });
      } else {
        setUserInfo(null);
      }

      try {
        const historyData = await getMedicalHistory();
        setMedicalHistory(Array.isArray(historyData) ? historyData : []);
      } catch (historyError) {
        console.error('Failed to load medical history:', historyError);
        setMedicalHistory([]);
      }
    } catch (error) {
      console.error('Failed to load account data:', error);
      setUserInfo(null);
      setMedicalHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              throw error;
            }

            onClose();
            onSignOut();
            Alert.alert('Success', 'Signed out successfully');
          } catch (error) {
            console.error('Sign out error:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleGuestBlockedPress = (featureName: string) => {
    Alert.alert(
      'Sign Up Required',
      `Please sign up or log in to access ${featureName}.`
    );
  };

  const handleProfilePress = () => {
    if (isGuest) {
      handleGuestBlockedPress('your profile');
      return;
    }

    setActiveTab('info');
    onShowProfile?.();
  };

  const handleHistoryPress = () => {
    if (isGuest) {
      handleGuestBlockedPress('your history');
      return;
    }

    setActiveTab('history');
    onShowHistory?.();
  };

  const handleBottomButtonPress = () => {
    if (isGuest) {
      onClose();
      onGoToAuthPage();
      return;
    }

    handleSignOut();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Account</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.navButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  activeTab === 'info' && !isGuest && styles.navButtonActive,
                  isGuest && styles.disabledButton,
                ]}
                onPress={handleProfilePress}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    activeTab === 'info' && !isGuest && styles.navButtonTextActive,
                    isGuest && styles.disabledButtonText,
                  ]}
                >
                  👤 Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  activeTab === 'history' && !isGuest && styles.navButtonActive,
                  isGuest && styles.disabledButton,
                ]}
                onPress={handleHistoryPress}
              >
                <Text
                  style={[
                    styles.navButtonText,
                    activeTab === 'history' && !isGuest && styles.navButtonTextActive,
                    isGuest && styles.disabledButtonText,
                  ]}
                >
                  📋 History
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {isGuest ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Sign up or log in to view your profile and history.
                  </Text>
                </View>
              ) : isLoading ? (
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

                      {userInfo.firstName ? (
                        <View style={styles.infoCard}>
                          <Text style={styles.label}>First Name</Text>
                          <Text style={styles.value}>{userInfo.firstName}</Text>
                        </View>
                      ) : null}

                      {userInfo.lastName ? (
                        <View style={styles.infoCard}>
                          <Text style={styles.label}>Last Name</Text>
                          <Text style={styles.value}>{userInfo.lastName}</Text>
                        </View>
                      ) : null}

                      {userInfo.age ? (
                        <View style={styles.infoCard}>
                          <Text style={styles.label}>Age</Text>
                          <Text style={styles.value}>{userInfo.age}</Text>
                        </View>
                      ) : null}

                      {userInfo.gender ? (
                        <View style={styles.infoCard}>
                          <Text style={styles.label}>Gender</Text>
                          <Text style={styles.value}>{userInfo.gender}</Text>
                        </View>
                      ) : null}

                      {userInfo.phone ? (
                        <View style={styles.infoCard}>
                          <Text style={styles.label}>Phone</Text>
                          <Text style={styles.value}>{userInfo.phone}</Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No user information available</Text>
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
                          {(item.confidence * 100).toFixed(1)}%
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

            <TouchableOpacity
              style={[
                styles.signOutButton,
                isGuest && styles.goToAuthButton,
              ]}
              onPress={handleBottomButtonPress}
            >
              <Text style={styles.signOutText}>
                {isGuest ? 'Go to Sign In / Sign Up' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.cardBackground,
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  safeArea: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  navButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  navButton: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  navButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  navButtonTextActive: {
    color: colors.white,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    borderColor: '#D0D0D0',
  },
  disabledButtonText: {
    color: '#888888',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  infoContainer: {
    paddingBottom: 12,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  historyContainer: {
    paddingBottom: 12,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  historyDiagnosis: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  historyConfidence: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: colors.errorText,
    borderRadius: 8,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  goToAuthButton: {
    backgroundColor: colors.primary,
  },
  signOutText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});