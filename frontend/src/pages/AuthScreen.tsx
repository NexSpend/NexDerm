import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';

type AuthMode = 'signin' | 'signup';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onGuestContinue: () => void;
}

export default function AuthScreen({ onAuthSuccess, onGuestContinue }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={commonStyles.flex}
      >
        <ScrollView 
          contentContainerStyle={commonStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={commonStyles.header}>
            <Text style={commonStyles.title}>🩺 NexDerm</Text>
            <Text style={commonStyles.subtitle}>AI-Powered Skin Lesion Detection</Text>
          </View>

          {/* BODY */}
          <View style={commonStyles.body}>
            {/* Tile Selector */}
            <View style={styles.tileContainer}>
              <TouchableOpacity
                style={[styles.tile, authMode === 'signin' && styles.tileActive]}
                onPress={() => setAuthMode('signin')}
              >
                <Text style={[styles.tileText, authMode === 'signin' && styles.tileTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tile, authMode === 'signup' && styles.tileActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[styles.tileText, authMode === 'signup' && styles.tileTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forms */}
            {authMode === 'signin' ? (
              <SignInForm />
            ) : (
              <SignUpForm />
            )}

            {/* Guest Button */}
            <TouchableOpacity
              style={commonStyles.secondaryButton}
              onPress={onGuestContinue}
            >
              <Text style={commonStyles.buttonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={commonStyles.footer}>
            <Text style={commonStyles.disclaimer}>
              Your data is secure. By continuing, you agree to our Terms & Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignInForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = () => {
    Alert.alert("Login Not Active", "Login functionality coming soon. Use 'Continue as Guest' for now.");
  };

  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "Password reset feature coming soon.");
  };
// `styling` for SignInForm remains in commonStyles
  return (
    <View style={commonStyles.card}>
      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Username</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Enter your username"
          placeholderTextColor={colors.textPlaceholder}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
{/* style for Forgot Password button remains in styles */}
      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Password</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Enter your password"
          placeholderTextColor={colors.textPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
        <Text style={commonStyles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={commonStyles.primaryButton} onPress={handleSignIn}>
        <Text style={commonStyles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignUpForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = () => {
    Alert.alert("Sign Up Not Active", "Registration feature coming soon. Use 'Continue as Guest' for now.");
  };

  return (
    <View style={commonStyles.card}>
      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Username</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Choose a username"
          placeholderTextColor={colors.textPlaceholder}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Email</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Enter your email"
          placeholderTextColor={colors.textPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>

      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Password</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Create a password"
          placeholderTextColor={colors.textPlaceholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Confirm Password</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Re-enter password"
          placeholderTextColor={colors.textPlaceholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity style={commonStyles.primaryButton} onPress={handleSignUp}>
        <Text style={commonStyles.buttonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

//Styles unique to AuthScreen
const styles = StyleSheet.create({
  // Tile Selector (unique to AuthScreen)
  tileContainer: {
    flexDirection: 'row',
    width: 280,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.tileBg,
  },
  tile: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tileActive: {
    backgroundColor: colors.primary,
  },
  tileText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  tileTextActive: {
    color: colors.white,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
});