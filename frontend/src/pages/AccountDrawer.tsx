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
  Platform,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../utils/commonStyles';
import { getUserInfo, getMedicalHistory } from '../services/api';
import { supabase } from '../services/supabase';

interface AccountDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onShowProfile?: () => void;
  onShowHistory?: () => void;
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
      const infoData = await getUserInfo();
      setUserInfo(infoData);

      const historyData = await getMedicalHistory();
      setMedicalHistory(historyData);
    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

              await AsyncStorage.removeItem('jwt');
              onClose();
              onSignOut();
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
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Account</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navButtonContainer}>
            <TouchableOpacity
              style={[styles.navButton, activeTab === 'info' && styles.navButtonActive]}
              onPress={() => {
                setActiveTab('info');
                onShowProfile?.();
              }}
            >
              <Text
                style={[
                  styles.navButtonText,
                  activeTab === 'info' && styles.navButtonTextActive,
                ]}
              >
                👤 Profile
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, activeTab === 'history' && styles.navButtonActive]}
              onPress={() => {
                setActiveTab('history');
                onShowHistory?.();
              }}
            >
              <Text
                style={[
                  styles.navButtonText,
                  activeTab === 'history' && styles.navButtonTextActive,
                ]}
              >
                📋 History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : activeTab === 'info' ? (
              <View style={styles.infoContainer}>
                {userInfo && (
                  <>
                    <View style={styles.infoCard}>
                      <Text style={styles.label}>Email</Text>
                      <Text style={styles.value}>{userInfo.email}</Text>
                    </View>

                    {userInfo.firstName && (
                      <View style={styles.infoCard}>
                        <Text style={styles.label}>First Name</Text>
                        <Text style={styles.value}>{userInfo.firstName}</Text>
                      </View>
                    )}

                    {userInfo.lastName && (
                      <View style={styles.infoCard}>
                        <Text style={styles.label}>Last Name</Text>
                        <Text style={styles.value}>{userInfo.lastName}</Text>
                      </View>
                    )}

                    {userInfo.age && (
                      <View style={styles.infoCard}>
                        <Text style={styles.label}>Age</Text>
                        <Text style={styles.value}>{userInfo.age}</Text>
                      </View>
                    )}

                    {userInfo.gender && (
                      <View style={styles.infoCard}>
                        <Text style={styles.label}>Gender</Text>
                        <Text style={styles.value}>{userInfo.gender}</Text>
                      </View>
                    )}

                    {userInfo.phone && (
                      <View style={styles.infoCard}>
                        <Text style={styles.label}>Phone</Text>
                        <Text style={styles.value}>{userInfo.phone}</Text>
                      </View>
                    )}
                  </>
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
                      {item.notes && (
                        <Text style={styles.historyNotes}>{item.notes}</Text>
                      )}
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

          {/* Footer Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signOutButton: {
    backgroundColor: colors.errorText,
    borderRadius: 8,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
});
