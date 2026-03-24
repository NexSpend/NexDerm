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
import {
  sendOtpCode,
  sendOtpCodePublic,
  verifyOtpCode,
  verifyOtpCodePublic,
} from '../services/api';

type AuthMode = 'signin' | 'signup';

interface AuthScreenProps {
  onAuthSuccess: (role: string) => void;
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

            <TouchableOpacity style={commonStyles.secondaryButton} onPress={onGuestContinue}>
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

function SignInForm({ onAuthSuccess }: { onAuthSuccess: (role: string) => void }) {
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      const token = data.session?.access_token;
      if (!token) {
        throw new Error('Could not get a Supabase access token.');
      }

      await sendOtpCode(email, token);
      setSupabaseToken(token);
      setAwaitingOTP(true);
    } catch (error: any) {
      try {
        await supabase.auth.signOut();
      } catch {}

      Alert.alert('Sign In Failed', error?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const latestToken = data.session?.access_token || supabaseToken;

      if (!latestToken) {
        throw new Error('No active session token found.');
      }

      await sendOtpCode(email, latestToken);
      setSupabaseToken(latestToken);

      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Resend Failed', error?.message || 'Failed to resend code.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter Email', 'Please enter your email first.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }

      Alert.alert('Password Reset', 'Password reset instructions have been sent to your email.');
    } catch (error: any) {
      Alert.alert('Reset Failed', error?.message || 'Could not send reset email.');
    }
  };

  const handleBackFromOTP = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}

    setSupabaseToken('');
    setAwaitingOTP(false);
  };

  if (awaitingOTP) {
    return (
      <OTPVerificationForm
        email={email}
        supabaseToken={supabaseToken}
        onAuthSuccess={onAuthSuccess}
        onResend={handleResendOTP}
        onBack={handleBackFromOTP}
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

      <TouchableOpacity
        style={commonStyles.primaryButton}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={commonStyles.buttonText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
}

interface OTPVerificationFormProps {
  email: string;
  supabaseToken: string;
  onAuthSuccess: (role: string) => void;
  onResend: () => Promise<void>;
  onBack: () => void;
}

function OTPVerificationForm({
  email,
  supabaseToken,
  onAuthSuccess,
  onResend,
  onBack,
}: OTPVerificationFormProps) {
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
      if (supabaseToken) {
        await verifyOtpCode(email, otp, supabaseToken);
      } else {
        await verifyOtpCodePublic(email, otp);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Could not get the authenticated user after verification.');
      }

      const { data: userData, error: roleError } = await supabase
        .from('newUsers')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (roleError) {
        onAuthSuccess('user');
        return;
      }

      onAuthSuccess(userData?.role || 'user');
    } catch (error: any) {
      Alert.alert('Verification Failed', error?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await onResend();
    } finally {
      setResending(false);
    }
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
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={commonStyles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResend}
        disabled={resending}
      >
        {resending ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={commonStyles.linkText}>Resend Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.otpBackButton} onPress={onBack}>
        <Text style={styles.otpBackText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignUpForm({ onAuthSuccess }: { onAuthSuccess: (role: string) => void }) {
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingOTP, setAwaitingOTP] = useState(false);
  const [supabaseToken, setSupabaseToken] = useState('');

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

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
          },
        },
      });

      if (error) {
        console.error('SUPABASE SIGNUP ERROR:', error);
        throw error;
      }

      if (!data?.user) {
        throw new Error('Signup succeeded but no user was returned.');
      }

      const token = data.session?.access_token ?? '';

      if (token) {
        await sendOtpCode(email, token);
        setSupabaseToken(token);
      } else {
        await sendOtpCodePublic(email);
        setSupabaseToken('');
      }

      setAwaitingOTP(true);
    } catch (error: any) {
      console.error('FULL SIGN UP ERROR:', JSON.stringify(error, null, 2));
      console.error('FULL SIGN UP ERROR RAW:', error);

      try {
        await supabase.auth.signOut();
      } catch {}

      Alert.alert(
        'Sign Up Failed',
        error?.message || error?.error_description || 'Unable to create account.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromOTP = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}

    setSupabaseToken('');
    setAwaitingOTP(false);
  };

  if (awaitingOTP) {
    return (
      <OTPVerificationForm
        email={email}
        supabaseToken={supabaseToken}
        onAuthSuccess={async () => {
          try {
            const {
              data: { user },
              error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
              throw new Error('Could not get the authenticated user.');
            }

            const { data: userData, error: roleError } = await supabase
              .from('newUsers')
              .select('role')
              .eq('id', user.id)
              .maybeSingle();

            if (roleError) {
              onAuthSuccess('user');
              return;
            }

            onAuthSuccess(userData?.role || 'user');
          } catch {
            onAuthSuccess('user');
          }
        }}
        onResend={async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const latestToken = data.session?.access_token || supabaseToken;

            if (latestToken) {
              await sendOtpCode(email, latestToken);
              setSupabaseToken(latestToken);
            } else {
              await sendOtpCodePublic(email);
              setSupabaseToken('');
            }

            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
          } catch (error: any) {
            Alert.alert('Resend Failed', error?.message || 'Failed to resend code.');
          }
        }}
        onBack={handleBackFromOTP}
      />
    );
  }

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