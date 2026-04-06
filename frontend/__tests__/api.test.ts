// This test suite verifies the functionality of the frontend API helper 
// functions in isolation, using Jest to mock network requests and device APIs. 
// It ensures that the API functions correctly handle authentication, request 
// formatting, error propagation, and integration with file system and sharing capabilities.

import {
  downloadReportPdf,
  getLatestReport,
  getMedicalHistory,
  getPendingCases,
  getUserInfo,
  submitDoctorReview,
  uploadImage,
} from '../src/services/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../src/services/supabase';

jest.mock('../src/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  downloadAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const mockedGetSession = supabase.auth.getSession as jest.Mock;
const mockedDownloadAsync = FileSystem.downloadAsync as jest.Mock;
const mockedIsAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const mockedShareAsync = Sharing.shareAsync as jest.Mock;

// Tests the frontend API helper functions in isolation with mocked network and device APIs.
describe('api service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
    jest.spyOn(console, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Verifies image upload sends FormData and includes the authenticated bearer token.
  it('uploadImage posts form data with the session token', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        prediction: 'Healthy',
        confidence: 0.9,
      }),
    });

    const result = await uploadImage('file:///lesion.jpg');

    expect(result).toEqual({ prediction: 'Healthy', confidence: 0.9 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predictions/'),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer token-123' },
        body: expect.any(FormData),
      })
    );
  });

  // Verifies image upload surfaces backend error details on failed requests.
  it('uploadImage throws the API detail when upload fails', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ detail: 'Bad image' }),
    });

    await expect(uploadImage('file:///lesion.jpg')).rejects.toThrow('Bad image');
  });

  // Verifies latest report retrieval rejects when there is no active session.
  it('getLatestReport throws when there is no logged-in user', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: null },
    });

    await expect(getLatestReport()).rejects.toThrow('No logged-in user');
  });

  // Verifies medical history parsing returns the reports array from the backend payload.
  it('getMedicalHistory returns reports from the API payload', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        reports: [{ id: '1', prediction: 'Healthy' }],
      }),
    });

    await expect(getMedicalHistory()).resolves.toEqual([
      { id: '1', prediction: 'Healthy' },
    ]);
  });

  // Verifies user info requests forward backend text errors instead of hiding them.
  it('getUserInfo forwards backend text errors', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('Forbidden'),
    });

    await expect(getUserInfo()).rejects.toThrow('Forbidden');
  });

  // Verifies pending case retrieval fails cleanly when the doctor is not authenticated.
  it('getPendingCases throws when Supabase reports no session', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(getPendingCases()).rejects.toThrow('User not authenticated.');
  });

  // Verifies doctor review submission sends the expected PATCH payload and auth header.
  it('submitDoctorReview sends the expected PATCH body', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    const result = await submitDoctorReview('case-1', 'notes here', 'eczema');

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/doctors/case-1/review'),
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
        body: JSON.stringify({
          doctor_notes: 'notes here',
          final_diagnosis: 'eczema',
        }),
      })
    );
  });

  // Verifies report download fetches the PDF URL, downloads the file, and invokes share flow.
  it('downloadReportPdf downloads and shares the generated PDF', async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        download_url: 'https://example.com/report.pdf',
      }),
    });
    mockedDownloadAsync.mockResolvedValue({
      uri: 'file:///documents/nexderm-report.pdf',
    });
    mockedIsAvailableAsync.mockResolvedValue(true);

    await downloadReportPdf('report-1');

    expect(mockedDownloadAsync).toHaveBeenCalledWith(
      'https://example.com/report.pdf',
      expect.stringContaining('nexderm-report-')
    );
    expect(mockedShareAsync).toHaveBeenCalledWith(
      'file:///documents/nexderm-report.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' })
    );
  });
});
