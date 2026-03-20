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
import { sendOtpCode, sendOtpCodePublic, verifyOtpCode, verifyOtpCodePublic } from '../services/api';

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
              <SignInForm onAuthSuccess={onAuthSuccess}/>
            ) : (
              <SignUpForm onAuthSuccess={onAuthSuccess}/>
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

function SignInForm({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [supabaseToken, setSupabaseToken] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);

    // Step 1: Verify email + password with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert('Sign In Failed', error.message);
      return;
    }

    const token = data.session?.access_token;
    if (!token) {
      setLoading(false);
      Alert.alert('Sign In Failed', 'Could not get a temporary session token.');
      return;
    }

    // Step 2: Trigger backend OTP email (Resend)
    let otpError: Error | null = null;
    try {
      await sendOtpCode(email, token);
    } catch (err: any) {
      otpError = err;
    }

    setLoading(false);

    if (otpError) {
      Alert.alert('Failed to Send Code', otpError.message || 'Failed to send verification code.');
      return;
    }

    // Step 3: Keep Supabase token temporarily until OTP verification is completed
    setSupabaseToken(token);

    // Step 4: Show OTP verification screen
    setAwaitingOTP(true);
  };

  const handleResendOTP = async () => {
    try {
      await sendOtpCode(email, supabaseToken);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Resend Failed', error.message || 'Failed to resend code.');
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset feature coming soon.');
  };

  if (awaitingOTP) {
    return (
      <OTPVerificationForm
        email={email}
        supabaseToken={supabaseToken}
        onAuthSuccess={onAuthSuccess}
        onResend={handleResendOTP}
        onBack={() => setAwaitingOTP(false)}
      />
    );
  }

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
      <TouchableOpacity style={commonStyles.primaryButton} onPress={handleSignIn} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.white} />
          : <Text style={commonStyles.buttonText}>Login</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// --- OTP Verification Screen (shown after successful password check) ---
interface OTPVerificationFormProps {
  email: string;
  supabaseToken: string;
  onAuthSuccess: () => void;
  onResend: () => Promise<void>;
  onBack: () => void;
}

function OTPVerificationForm({ email, supabaseToken, onAuthSuccess, onResend, onBack }: OTPVerificationFormProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);

    try {
      const result = supabaseToken
        ? await verifyOtpCode(email, otp, supabaseToken)
        : await verifyOtpCodePublic(email, otp);
      await AsyncStorage.setItem('jwt', result.access_token);
      if (result.expires_at) {
        await AsyncStorage.setItem('jwt_expires_at', result.expires_at);
      }
      await supabase.auth.signOut();
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Verification Failed', error.message || 'Invalid verification code.');
      return;
    }

    setLoading(false);
    onAuthSuccess();
  };

  const handleResend = async () => {
    setResending(true);
    await onResend();
    setResending(false);
  };

  return (
    <View style={commonStyles.card}>
      <Text style={styles.otpTitle}>Check Your Email</Text>
      <Text style={styles.otpSubtitle}>
        {'We sent a 6-digit code to\n'}
        <Text style={styles.otpEmail}>{email}</Text>
      </Text>

      <View style={commonStyles.inputGroup}>
        <Text style={commonStyles.inputLabel}>Verification Code</Text>
        <TextInput
          style={[commonStyles.textInput, styles.otpInput]}
          placeholder="000000"
          placeholderTextColor={colors.textPlaceholder}
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={commonStyles.primaryButton}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.white} />
          : <Text style={commonStyles.buttonText}>Verify Code</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={resending}>
        {resending
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Text style={commonStyles.linkText}>Resend Code</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.otpBackButton} onPress={onBack}>
        <Text style={styles.otpBackText}>← Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
function SignUpForm({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [supabaseToken, setSupabaseToken] = useState('');

  const handleSignUp = async () => {
    if (!username || !email || !password || !confirmPassword) {
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert('Sign Up Failed', error.message);
      return;
    }
    // Try to get a temporary session token to request an OTP
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    // Trigger OTP send via backend. If we don't have a session token (common
    // after signUp), fall back to the public send endpoint which uses the
    // server-side service role client to deliver the OTP.
    if (token) {
      try {
        await sendOtpCode(email, token);
        setSupabaseToken(token);
        setAwaitingOTP(true);
      } catch (err: any) {
        setLoading(false);
        Alert.alert('Failed to Send Code', err.message || 'Failed to send verification code.');
        return;
      }
    } else {
      try {
        await sendOtpCodePublic(email);
        // no supabase token available; OTP verification will use public verify
        setSupabaseToken('');
        setAwaitingOTP(true);
      } catch (err: any) {
        setLoading(false);
        Alert.alert('Failed to Send Code', err.message || 'Failed to send verification code.');
        return;
      }
    }

    setLoading(false);
  };

  return (
    <View style={commonStyles.card}>
      {awaitingOTP ? (
        <OTPVerificationForm
          email={email}
          supabaseToken={supabaseToken}
          onAuthSuccess={onAuthSuccess}
          onResend={async () => {
                try {
                  if (supabaseToken) {
                    await sendOtpCode(email, supabaseToken);
                  } else {
                    await sendOtpCodePublic(email);
                  }
                  Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
                } catch (err: any) {
                  Alert.alert('Resend Failed', err.message || 'Failed to resend code.');
                }
          }}
          onBack={() => setAwaitingOTP(false)}
        />
      ) : (
        <>
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
          <TouchableOpacity style={commonStyles.primaryButton} onPress={handleSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : <Text style={commonStyles.buttonText}>Create Account</Text>}
          </TouchableOpacity>
        </>
      )}
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

  // OTP Verification Screen
  otpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  otpEmail: {
    fontWeight: '700',
    color: colors.primary,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    paddingVertical: 14,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  otpBackButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  otpBackText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
