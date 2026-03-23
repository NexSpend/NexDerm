import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/commonStyles';

interface AccountButtonProps {
  onPress: () => void;
  userName?: string;
}

const getInitials = (name: string): string => {
  return name
    .trim()
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
