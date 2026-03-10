// export const API_URL = "http://127.0.0.1:8000/api/v1";
// http://127.0.0.1:8000/docs : Use this to check the backend API documentation

// Use your local network IP when testing on Expo Go on mobile device iOS , ipconfig for windows / ifconfig for mac to get local ip guys
export const API_URL = "http://192.168.2.245:8000/api/v1";


export interface PredictionResponse {
  prediction: string;
  confidence: number;
  recommendations: string;
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

    // we gotta change this to blob if u guys wanna test this for expo web , rn it works for expo go app for iphone/android
    formData.append("file", {
      uri: imageUri,
      name: `upload_${Date.now()}.jpg`,
      type: "image/jpeg",
    } as any);

    const response = await fetch(`${API_URL}/predictions/`, {
      method: "POST",
      body: formData,
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
    const response = await fetch(
      `${API_URL}/dermatologists/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
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

// User Profile API functions
export interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  profile_image_url?: string;
}

export const getUserProfile = async (userId: number): Promise<UserProfile> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch user profile (${response.status}): ${text}`);
    }

    return (await response.json()) as UserProfile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (
  userId: number,
  updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    profile_image_url?: string;
  }
): Promise<UserProfile> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update user profile (${response.status}): ${text}`);
    }

    return (await response.json()) as UserProfile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const errorStatus = response.status;
      
      if (errorStatus === 401) {
        throw new Error("Unauthorized: Current password is incorrect");
      } else if (errorStatus === 400) {
        throw new Error(`Validation error: ${text}`);
      } else {
        throw new Error(`Failed to change password (${errorStatus}): ${text}`);
      }
    }

    return (await response.json()) as { message: string };
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
};

