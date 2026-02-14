import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { commonStyles, colors } from '../utils/commonStyles';

interface Dermatologist {
  name: string;
  address: string;
  rating: number;
  distance: number;
  lat?: number;
  lng?: number;
}

interface DermatologistMapScreenProps {
  onBackToResults: () => void;
}

export default function DermatologistMapScreen({
  onBackToResults,
}: DermatologistMapScreenProps) {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [topDermatologists, setTopDermatologists] = useState<Dermatologist[]>([]);

  const openMapsNavigation = (latitude: number, longitude: number, name: string) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(name)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Location access is required to show nearby dermatologists.'
          );
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        setLoading(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to get your location. Please try again.');
        setLoading(false);
      }
    };

    getUserLocation();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding nearby dermatologists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userLocation) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to get your location</Text>
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={onBackToResults}
          >
            <Text style={commonStyles.buttonText}>Back to Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Build the HTML map with Google Places API
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Dermatologist Locator</title>
      <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places"></script>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #map { width: 100%; height: 300px; }
        #info {
          position: absolute;
          top: 10px;
          left: 10px;
          background: white;
          padding: 10px;
          border-radius: 5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          font-size: 12px;
          max-width: 200px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="info">Loading dermatologists...</div>
      <script>
        function calculateDistance(lat1, lon1, lat2, lon2) {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return (R * c).toFixed(2);
        }

        const userLocation = { lat: ${userLocation.latitude}, lng: ${userLocation.longitude} };
        const map = new google.maps.Map(document.getElementById('map'), {
          zoom: 14,
          center: userLocation,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const service = new google.maps.places.PlacesService(map);

        // Custom marker icons
        const userMarkerIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        };

        const dermMarkerIcon = {
          path: 'M12 0C7.58 0 4 3.58 4 8c0 5.25 8 15 8 15s8-9.75 8-15c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 4.5 12 4.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z',
          scale: 2,
          fillColor: '#EF4444',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2,
          anchor: new google.maps.Point(12, 24),
        };

        // User location marker
        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: 'Your Location',
          icon: userMarkerIcon,
          zIndex: 100,
        });

        // Search for dermatologists using Google Places API
        const request = {
          location: userLocation,
          radius: 15000,
          keyword: 'dermatology OR dermatologist OR skin clinic'
        };

        service.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            let dermatologists = [];
            
            results.forEach((place, index) => {
              if (index < 20) {
                const distance = calculateDistance(
                  userLocation.lat, 
                  userLocation.lng, 
                  place.geometry.location.lat(), 
                  place.geometry.location.lng()
                );
                
                dermatologists.push({
                  name: place.name,
                  address: place.vicinity || 'Address not available',
                  rating: place.rating || 0,
                  distance: parseFloat(distance),
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                });
                
                const marker = new google.maps.Marker({
                  position: place.geometry.location,
                  map: map,
                  title: place.name,
                  icon: dermMarkerIcon,
                  zIndex: 50,
                });

                const infoWindow = new google.maps.InfoWindow({
                  content: \`<div style="background: linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 100%); padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; border-radius: 12px; border-left: 5px solid #4F46E5; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1); max-width: 280px; min-width: 200px;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="font-size: 28px; line-height: 1;">🏥</div>
                      <div style="flex: 1;">
                        <div style="font-size: 15px; font-weight: 700; color: #1F2937; margin-bottom: 8px; letter-spacing: 0.3px;">\${place.name}</div>
                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 12px; line-height: 1.5;">\${place.vicinity || 'Address not available'}</div>
                        <div style="display: flex; gap: 12px; border-top: 1px solid #E5E7EB; padding-top: 10px;">
                          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #4F46E5; font-weight: 600;">📍 \${distance} km</div>
                          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #FCA311; font-weight: 600;">⭐ \${place.rating ? place.rating.toFixed(1) : 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>\`
                });

                marker.addListener('click', () => {
                  infoWindow.open(map, marker);
                });
              }
            });
            
            // Sort by distance and get top 3
            dermatologists.sort((a, b) => a.distance - b.distance);
            const top3 = dermatologists.slice(0, 3);
            
            // Send data to React
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'DERMATOLOGISTS',
              data: top3
            }));
            
            document.getElementById('info').innerHTML = 'Found ' + dermatologists.length + ' dermatologists nearby';
            setTimeout(() => document.getElementById('info').style.display = 'none', 3000);
          } else {
            document.getElementById('info').innerHTML = 'No dermatologists found. Status: ' + status;
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* HEADER */}
      <View style={commonStyles.header}>
        <Text style={commonStyles.title}>🩺 NexDerm</Text>
        <Text style={commonStyles.subtitle}>Nearby Dermatologists</Text>
      </View>

      {/* MAP */}
      <WebView
        source={{ html: htmlContent }}
        style={styles.map}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'DERMATOLOGISTS') {
              setTopDermatologists(message.data);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        }}
      />

      {/* TOP 3 DERMATOLOGISTS */}
      <ScrollView style={styles.listContainer}>
        <Text style={styles.listTitle}>Top 3 Closest Dermatologists</Text>
        {topDermatologists.length > 0 ? (
          topDermatologists.map((derm, index) => (
            <View key={index} style={styles.dermCard}>
              <Text style={styles.dermIndex}>{index + 1}</Text>
              <View style={styles.dermInfo}>
                <Text style={styles.dermName}>{derm.name}</Text>
                <Text style={styles.dermAddress}>{derm.address}</Text>
                <View style={styles.dermFooter}>
                  <View style={styles.statsContainer}>
                    <Text style={styles.dermDistance}>📍 {derm.distance} km</Text>
                    <Text style={styles.dermRating}>⭐ {derm.rating.toFixed(1)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => openMapsNavigation(derm.lat || 0, derm.lng || 0, derm.name)}
                  >
                    <Text style={styles.navButtonText}>→ Navigate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noResultsText}>Loading dermatologists...</Text>
        )}
      </ScrollView>

      {/* FOOTER BUTTON */}
      <TouchableOpacity
        style={[commonStyles.primaryButton, styles.backButton]}
        onPress={onBackToResults}
      >
        <Text style={commonStyles.buttonText}>← Back to Results</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 350,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.errorText,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: colors.background,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
    letterSpacing: 0.3,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  dermCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 0,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dermIndex: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginRight: 16,
    minWidth: 45,
    height: 45,
    textAlign: 'center',
    paddingTop: 8,
    borderRadius: 50,
    backgroundColor: colors.primary,
  },
  dermInfo: {
    flex: 1,
  },
  dermName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  dermAddress: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 10,
    lineHeight: 18,
  },
  dermFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dermDistance: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  dermRating: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  navButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
  },
  backButton: {
    margin: 16,
    borderRadius: 8,
  },
});
