// export const API_URL = "http://127.0.0.1:8000/api/v1";
// http://127.0.0.1:8000/docs : Use this to check the backend API documentation

// Use your local network IP when testing on Expo Go on mobile device iOS , ipconfig for windows / ifconfig for mac to get local ip guys
export const API_URL = "http://192.168.2.245:8000/api/v1";


export interface PredictionResponse {
  prediction: string;
  confidence: number;
  recommendations: string;
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


