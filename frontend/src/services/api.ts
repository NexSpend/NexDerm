// export const API_URL = "http://127.0.0.1:8000/api/v1";
// http://127.0.0.1:8000/docs : Use this to check the backend API documentation

import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your local network IP when testing on Expo Go on mobile device iOS , ipconfig for windows / ifconfig for mac to get local ip guys
export const API_URL = "http://192.168.0.101:8000/api/v1";


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

    const token = await AsyncStorage.getItem('jwt');
    if (!token) {
        throw new Error("Authentication token not found.");
    }

    const response = await fetch(`${API_URL}/predictions/`, {
      method: "POST",
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
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
    const token = await AsyncStorage.getItem('jwt');
    if (!token) throw new Error("Authentication token not found.");

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
    const token = await AsyncStorage.getItem('jwt');

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

/**
 * Interface for a pending case report.
 */

export interface PendingCase {
    id: string;
    prediction: string;
    confidence: number;
    created_at: string;
}

/**
 * Fetches a list of pending cases that require a doctor's review.
 * Requires a JWT for authentication.
 * @returns A promise that resolves to an array of PendingCase objects.
 * @throws Error if authentication token is not found or API call fails.
 */
export const getPendingCases = async (): Promise<PendingCase[]> => {
    try {
        const token = await AsyncStorage.getItem('jwt');
        if (!token) throw new Error("Authentication token not found.");
        // Make GET request to the backend /doctors/pending endpoint

        const response = await fetch(`${API_URL}/doctors/pending`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch pending cases (${response.status}): ${errorText}`);
        } 

        return (await response.json()) as PendingCase[];
    } catch (error) {
        console.error("Error fetching pending cases:", error);
        throw error;
    }
};

export const submitDoctorReview = async (caseId: string, notes: string, diagnosis: string): Promise<any> => {
    try {
        const token = await AsyncStorage.getItem('jwt');
        if (!token) throw new Error("Authentication token not found.");

        const body = JSON.stringify({
            doctor_notes: notes,
            final_diagnosis: diagnosis,
        });

        const response = await fetch(`${API_URL}/doctors/${caseId}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: body,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to submit review (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error submitting doctor review:", error);
        throw error;
    }
};
