// export const API_URL = "http://127.0.0.1:8000/api/v1";
// http://127.0.0.1:8000/docs : Use this to check the backend API documentation

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
// Use your local network IP when testing on Expo Go on mobile device iOS , ipconfig for windows / ifconfig for mac to get local ip guys
export const API_URL = "http://192.168.2.174:8000/api/v1";

export interface VerifyOtpResponse {
  message: string;
  access_token: string;
  token_type: string;
  expires_at?: string; // ISO timestamp when the token expires
}

export const sendOtpCode = async (email: string, supabaseToken: string): Promise<void> => {
  const response = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${supabaseToken}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send verification code (${response.status}): ${text}`);
  }
};

export const sendOtpCodePublic = async (email: string): Promise<void> => {
  const response = await fetch(`${API_URL}/auth/send-otp-public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send verification code (${response.status}): ${text}`);
  }
};

export const verifyOtpCode = async (
  email: string,
  code: string,
  supabaseToken: string
): Promise<VerifyOtpResponse> => {
  const response = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${supabaseToken}`,
    },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Verification failed (${response.status}): ${text}`);
  }

  return (await response.json()) as VerifyOtpResponse;
};

export const verifyOtpCodePublic = async (
  email: string,
  code: string
): Promise<VerifyOtpResponse> => {
  const response = await fetch(`${API_URL}/auth/verify-otp-public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Verification failed (${response.status}): ${text}`);
  }

  return (await response.json()) as VerifyOtpResponse;
};

export interface PredictionResponse {
  prediction: string;
  confidence: number;
}

export interface Dermatologist {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  specialties?: string;
  rating?: number;
  distance?: number;
}

export const uploadImage = async (
  imageUri: string
): Promise<PredictionResponse> => {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: `upload_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/predictions/`, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to process image. Please try again.");
    }

    return (await response.json()) as PredictionResponse;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export const getNearbyDermatologists = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 10
): Promise<Dermatologist[]> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      throw new Error('No logged-in user');
    }

    const response = await fetch(
      `${API_URL}/dermatologists/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch dermatologists (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.dermatologists as Dermatologist[];
  } catch (error) {
    console.error("Error fetching dermatologists:", error);
    throw error;
  }
};

export interface LatestReportResponse {
  report_id: string;
  prediction: string;
  confidence: number;
  file_name: string;
  download_url: string;
  created_at: string;
}

export const getLatestReport = async (): Promise<LatestReportResponse> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      throw new Error('No logged-in user');
    }

    const response = await fetch(`${API_URL}/reports/latest`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch latest report (${response.status}): ${text}`);
    }

    return (await response.json()) as LatestReportResponse;
  } catch (error) {
    console.error('Error fetching latest report:', error);
    throw error;
  }
};

export const getUserInfo = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    throw new Error('No logged-in user');
  }

  const response = await fetch(`${API_URL}/users/info`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to fetch user info');
  }

  return response.json();
};

export interface MedicalHistoryItem {
  id: string;
  prediction: string | null;
  confidence: number | null;
  report_url: string | null;
  image_url?: string | null;
  report_file_name?: string | null;
  created_at: string | null;
  status?: string | null;
  doctor_notes?: string | null;
  final_diagnosis?: string | null;
  reviewed_at?: string | null;
}

export const getMedicalHistory = async (): Promise<MedicalHistoryItem[]> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      throw new Error('No logged-in user');
    }

    const response = await fetch(`${API_URL}/reports/history`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch medical history (${response.status}): ${text}`);
    }

    const data = await response.json();
    return (data.reports || []) as MedicalHistoryItem[];
  } catch (error) {
    console.error('Error fetching medical history:', error);
    throw error;
  }
};



export interface ProfileResponse {
  full_name: string;
  email: string;
}
/**
 * Interface for a pending case report.
 */

export interface PendingCase {
  id: string;
  prediction: string;
  confidence: number;
  created_at: string;
  image_url?: string;
  user_name?: string;
  user_email?: string;
}

/**
 * Fetches a list of pending cases that require a doctor's review.
 * Uses the current Supabase session access token for authentication.
 * @returns A promise that resolves to an array of PendingCase objects.
 * @throws Error if the user is not authenticated or the API call fails.
 */
export const getPendingCases = async (): Promise<PendingCase[]> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('User not authenticated.');
    }

    const token = session.access_token;

    const response = await fetch(`${API_URL}/doctors/pending`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch pending cases (${response.status}): ${errorText}`
      );
    }

    return (await response.json()) as PendingCase[];
  } catch (error) {
    console.error('Error fetching pending cases:', error);
    throw error;
  }
};

/**
 * Submits a doctor's review for a specific case.
 * Uses the current Supabase session access token for authentication.
 * @param caseId The ID of the case being reviewed.
 * @param notes The doctor's review notes.
 * @param diagnosis The doctor's final diagnosis.
 * @returns A promise that resolves to the API response.
 * @throws Error if the user is not authenticated or the API call fails.
 */
export const submitDoctorReview = async (
  caseId: string,
  notes: string,
  diagnosis: string
): Promise<any> => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('User not authenticated.');
    }

    const token = session.access_token;

    const body = JSON.stringify({
      doctor_notes: notes,
      final_diagnosis: diagnosis,
    });

    const response = await fetch(`${API_URL}/doctors/${caseId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to submit doctor review (${response.status}): ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting doctor review:', error);
    throw error;
  }
};

export const downloadReportPdf = async (reportId: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    throw new Error('No logged-in user');
  }

  const response = await fetch(`${API_URL}/reports/${reportId}/download`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get download URL (${response.status}): ${text}`);
  }

  const { download_url } = await response.json();
  const fileUri = FileSystem.documentDirectory + `nexderm-report-${Date.now()}.pdf`;
  const downloadResult = await FileSystem.downloadAsync(download_url, fileUri);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Download NexDerm Report',
      UTI: 'com.adobe.pdf',
    });
  }
};