// export const API_URL = "http://127.0.0.1:8000/api/v1";
// http://127.0.0.1:8000/docs : Use this to check the backend API documentation

import { supabase } from './supabase';
// Use your local network IP when testing on Expo Go on mobile device iOS , ipconfig for windows / ifconfig for mac to get local ip guys
export const API_URL = "http://10.0.0.193:8000/api/v1";

import { Alert, Linking } from 'react-native';

export interface PredictionResponse {
  prediction: string;
  confidence: number;
  recommendations: string;
  model_outputs?: {
    densenet: { prediction: string; confidence: number };
    resnet: { prediction: string; confidence: number };
  };
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
      const text = await response.text();
      throw new Error(`Upload failed (${response.status}): ${text}`);
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

export const getMedicalHistory = async () => {
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
    return data.reports || [];
  } catch (error) {
    console.error('Error fetching medical history:', error);
    throw error;
  }
};


export const downloadReportPdf = async (reportUrl: string) => {
  try {
    const supported = await Linking.canOpenURL(reportUrl);

    if (!supported) {
      throw new Error('Cannot open PDF URL');
    }

    await Linking.openURL(reportUrl);
  } catch (error) {
    console.error('Error opening PDF:', error);
    Alert.alert('Error', 'Could not open report PDF');
  }
};

export interface ProfileResponse {
  full_name: string;
  email: string;
}