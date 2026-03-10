import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { colors } from '../utils/commonStyles';
import { useUser } from '../context/UserContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onLogout: () => void;
  onProfile?: () => void;
}

const SIDEBAR_WIDTH = 280;

export default function Sidebar({
  isOpen,
  onClose,
  userEmail = 'User',
  onLogout,
  onProfile,
}: SidebarProps) {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const { user } = useUser();

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slideAnim]);

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const displayName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user?.email || userEmail;

  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.sidebarContent}>
          {/* Header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.largeAvatar}>
              {user?.profile_image_url ? (
                <Image 
                  source={{ uri: user.profile_image_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.largeAvatarText}>
                  {initials}
                </Text>
              )}
            </View>
            <Text style={styles.userEmail}>{displayName}</Text>
            <Text style={styles.userStatus}>Signed In</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                onProfile?.();
                onClose();
              }}
            >
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Medical History</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: 'white',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  sidebarHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  largeAvatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  menuContainer: {
    flex: 1,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textDark,
  },
  logoutButton: {
    backgroundColor: colors.errorLight,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    alignSelf: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});
