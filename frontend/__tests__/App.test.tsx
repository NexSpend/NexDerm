import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/services/supabase';
import { uploadImage } from '../src/services/api';

jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('../src/services/api', () => ({
  uploadImage: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('../src/pages/AuthScreen', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return function MockAuthScreen(props: any) {
    return (
      <>
        <Text>AuthScreen</Text>
        <TouchableOpacity onPress={() => props.onGuestContinue()}>
          <Text>Continue as Guest</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => props.onAuthSuccess('doctor')}>
          <Text>Login as Doctor</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => props.onAuthSuccess('patient')}>
          <Text>Login as Patient</Text>
        </TouchableOpacity>
      </>
    );
  };
});

jest.mock('../src/pages/InferencePage', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return function MockInferencePage(props: any) {
    return (
      <>
        <Text>InferencePage</Text>
        <Text>{props.result.prediction}</Text>
        <TouchableOpacity onPress={props.onBackToUpload}>
          <Text>Back to Upload</Text>
        </TouchableOpacity>
      </>
    );
  };
});

jest.mock('../src/pages/DermatologistMapScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockDermatologistMapScreen() {
    return <Text>DermatologistMapScreen</Text>;
  };
});

jest.mock('../src/pages/AccountDrawer', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockAccountDrawer() {
    return <Text>AccountDrawer</Text>;
  };
});

jest.mock('../src/pages/ProfilePage', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockProfilePage() {
    return <Text>ProfilePage</Text>;
  };
});

jest.mock('../src/pages/HistoryPage', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockHistoryPage() {
    return <Text>HistoryPage</Text>;
  };
});

jest.mock('../src/pages/ChangePasswordPage', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockChangePasswordPage() {
    return <Text>ChangePasswordPage</Text>;
  };
});

jest.mock('../src/pages/AccountButton', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return function MockAccountButton(props: any) {
    return (
      <TouchableOpacity onPress={props.onPress}>
        <Text>AccountButton</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../src/pages/DoctorDashboard', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockDoctorDashboard() {
    return <Text>DoctorDashboard</Text>;
  };
});

jest.mock('../src/pages/LoadingScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function MockLoadingScreen() {
    return <Text>LoadingScreen</Text>;
  };
});

const mockedGetUser = supabase.auth.getUser as jest.Mock;
const mockedSignOut = supabase.auth.signOut as jest.Mock;
const mockedOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockedFrom = supabase.from as jest.Mock;
const mockedUploadImage = uploadImage as jest.Mock;
const mockedRequestMediaLibraryPermissionsAsync =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockedRequestCameraPermissionsAsync =
  ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockedLaunchImageLibraryAsync = ImagePicker.launchImageLibraryAsync as jest.Mock;

// Tests high-level App.tsx navigation and upload flows with child screens mocked out.
describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    mockedGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com', user_metadata: {} } },
      error: null,
    });
    mockedSignOut.mockResolvedValue({});
    mockedOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    mockedFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { full_name: 'Pat Example' },
        error: null,
      }),
    });
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // Verifies the app starts on the authentication screen for unauthenticated users.
  it('renders the auth screen by default', () => {
    render(<App />);

    expect(screen.getByText('AuthScreen')).toBeTruthy();
  });

  // Verifies doctor login routes the user to the doctor dashboard.
  it('shows the doctor dashboard after doctor auth success', async () => {
    render(<App />);

    fireEvent.press(screen.getByText('Login as Doctor'));

    await waitFor(() => {
      expect(screen.getByText('DoctorDashboard')).toBeTruthy();
    });
  });

  // Verifies the app shows a permission alert when gallery access is denied.
  it('shows an alert when photo library permission is denied', async () => {
    mockedRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });

    render(<App />);

    fireEvent.press(screen.getByText('Continue as Guest'));
    fireEvent.press(screen.getByText('Upload Image'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Denied',
        'Please allow photo access to upload.'
      );
    });
  });

  // Verifies selecting an image and uploading it leads to loading state and inference results.
  it('picks an image and shows inference after a successful upload', async () => {
    mockedRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockedLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg' }],
    });
    mockedUploadImage.mockResolvedValue({
      prediction: 'Healthy',
      confidence: 0.91,
    });

    render(<App />);

    fireEvent.press(screen.getByText('Continue as Guest'));
    fireEvent.press(screen.getByText('Upload Image'));

    await waitFor(() => {
      expect(screen.getByText('Change Image')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Start Detection'));

    expect(screen.getByText('LoadingScreen')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    await waitFor(() => {
      expect(screen.getByText('InferencePage')).toBeTruthy();
      expect(screen.getByText('Healthy')).toBeTruthy();
    });
  });

  // Verifies upload failures surface an error alert instead of silently failing.
  it('shows an error alert when uploadImage fails', async () => {
    mockedRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockedLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg' }],
    });
    mockedUploadImage.mockRejectedValue(new Error('Upload failed'));

    render(<App />);

    fireEvent.press(screen.getByText('Continue as Guest'));
    fireEvent.press(screen.getByText('Upload Image'));

    await waitFor(() => {
      expect(screen.getByText('Change Image')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Start Detection'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Upload failed');
    });
  });

  // Verifies leaving the inference screen resets the app back to the upload state.
  it('resets back to upload after leaving the inference page', async () => {
    mockedRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockedLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg' }],
    });
    mockedUploadImage.mockResolvedValue({
      prediction: 'Healthy',
      confidence: 0.91,
    });

    render(<App />);

    fireEvent.press(screen.getByText('Continue as Guest'));
    fireEvent.press(screen.getByText('Upload Image'));

    await waitFor(() => {
      expect(screen.getByText('Change Image')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Start Detection'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    await waitFor(() => {
      expect(screen.getByText('InferencePage')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Back to Upload'));

    await waitFor(() => {
      expect(screen.getByText('Upload Image')).toBeTruthy();
    });
  });
});
