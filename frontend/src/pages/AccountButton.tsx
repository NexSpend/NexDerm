import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/commonStyles';

interface AccountButtonProps {
  onPress: () => void;
  userName?: string;
}

const getInitials = (name: string): string => {
  const trimmed = (name || '').trim();

  if (!trimmed || trimmed.toUpperCase() === 'N/A') {
    return 'U';
  }

  const initials = trimmed
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  return initials || 'U';
};

export default function AccountButton({ onPress, userName = 'User' }: AccountButtonProps) {
  const initials = getInitials(userName);

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.initials}>{initials}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 82,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  initials: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
