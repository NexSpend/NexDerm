import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ActivityIndicator,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { supabase } from '../services/supabase';

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
          <View style={commonStyles.header}>
            <Text style={commonStyles.title}>🩺 NexDerm</Text>
            <Text style={commonStyles.subtitle}>AI-Powered Skin Lesion Detection</Text>
          </View>

          <View style={commonStyles.body}>
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

            {authMode === 'signin' ? (
              <SignInForm onAuthSuccess={onAuthSuccess} />
            ) : (
              <SignUpForm onAuthSuccess={onAuthSuccess} />
            )}

            <TouchableOpacity
              style={commonStyles.secondaryButton}
              onPress={onGuestContinue}
            >
              <Text style={commonStyles.buttonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

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

function SignInForm({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Sign In Failed', error.message);
      return;
    }

    const token = data.session?.access_token;
    if (!token) {
      Alert.alert('Error', 'No access token found.');
      return;
    }

    await AsyncStorage.setItem('jwt', token);
    onAuthSuccess();
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset feature coming soon.');
  };

  return (
    <View style={commonStyles.card}>
      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Email</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Enter your email"
          placeholderTextColor={colors.textPlaceholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
      </View>

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

      <TouchableOpacity
        style={commonStyles.primaryButton}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={commonStyles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SignUpForm({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!full_name || !email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    // Step 1: Create auth account in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign Up Failed', error.message);
      return;
    }

    const supabaseUserId = data.user?.id;

    if (!supabaseUserId) {
      setLoading(false);
      Alert.alert('Sign Up Failed', 'User account created, but no user ID was returned.');
      return;
    }

    // Step 2: Insert profile into your own table
    const { error: dbError } = await supabase.from('newUsers').insert([
      {
        id: supabaseUserId,
        full_name,
        email,
        role: 'user',
      },
    ]);

    setLoading(false);

    if (dbError) {
      Alert.alert(
        'Warning',
        `Account created but profile save failed: ${dbError.message}`
      );
      return;
    }

    // If email confirmation is enabled, session may be null here
    if (!data.session) {
      Alert.alert(
        'Account Created!',
        'Please check your email and verify your account before signing in.'
      );
      return;
    }

    // If a session exists immediately, save JWT and log in
    const token = data.session.access_token;
    await AsyncStorage.setItem('jwt', token);

    Alert.alert('Account Created!', 'Your account has been created successfully.', [
      { text: 'OK', onPress: onAuthSuccess },
    ]);
  };

  return (
    <View style={commonStyles.card}>
      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Full Name</Text>
        <TextInput
          style={commonStyles.textInput}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textPlaceholder}
          value={full_name}
          onChangeText={setFullName}
          autoCapitalize="words"
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

      <TouchableOpacity
        style={commonStyles.primaryButton}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={commonStyles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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