// AccountButton.tsx

// Imports
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors} from '../utils/commonStyles';

/**
This component renders a circular account button that displays the user's initials. 
It is placed in the top-left corner of the app and is the entry point to the user's account or profile page.
@property {function} onPress - Callback to navigate to Account Drawer when the button is pressed.
@property {string} [userName] - The full name of the user to extract initials from.
 */
interface AccountButtonProps {
  onPress: () => void;
  userName?: string;
}

/**
Parses a display name to extract up to two uppercase initials.
@param {string} name - The raw name string to parse.
@returns {string} The extracted initials, or "U" as a fallback.
 */
const getInitials = (name: string): string => {
  const trimmed = (name || '').trim();

  if (!trimmed || trimmed.toUpperCase() === 'N/A') {
    return 'U';
  }

  // Extracting initials
  const initials = trimmed
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  return initials || 'U';
};

/**
Exporting the final component
 */
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
