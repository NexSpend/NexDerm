import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { colors } from '../utils/commonStyles';

interface AccountButtonProps {
  onPress: () => void;
  userEmail?: string;
}

export default function AccountButton({ onPress, userEmail }: AccountButtonProps) {
  return (
    <TouchableOpacity
      style={styles.accountButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {userEmail ? userEmail.charAt(0).toUpperCase() : '👤'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  accountButton: {
    padding: 8,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
