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
import AccountButton from './AccountButton';

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
  onAccountPress?: () => void;
  userName?: string;
}

export default function DermatologistMapScreen({
  onBackToResults,
  onAccountPress,
  userName = 'User',
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
        {onAccountPress && <AccountButton onPress={onAccountPress} userName={userName} />}
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
        {onAccountPress && <AccountButton onPress={onAccountPress} userName={userName} />}
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
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          font-family: Arial, sans-serif;
          background: #f7f9fc;
        }
        #map { width: 100%; height: 100%; }
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
      {/* Account Button */}
      {onAccountPress && <AccountButton onPress={onAccountPress} userName={userName} />}

      <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent}>
        {/* HEADER */}
        <View style={commonStyles.header}>
          <Text style={commonStyles.title}>🩺 NexDerm</Text>
          <Text style={commonStyles.subtitle}>Nearby dermatologists</Text>
        </View>

        {/* MAP */}
        <View style={styles.mapContainer}>
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
        </View>

        {/* TOP 3 DERMATOLOGISTS */}
        <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderTopRow}>
            <View>
              <Text style={styles.listTitle}>Top 3 matches near you</Text>
              <Text style={styles.listMeta}>Ranked by closest distance</Text>
            </View>
          </View>
          <View style={styles.listHeaderAccent} />
        </View>
        {topDermatologists.length > 0 ? (
          topDermatologists.map((derm, index) => (
            <View
              key={`${derm.name}-${index}`}
              style={[styles.dermCard, index === 0 && styles.dermCardPrimary]}
            >
              <View
                style={[
                  styles.rankBadge,
                  index === 0 && styles.rankBadgeGold,
                  index === 1 && styles.rankBadgeSilver,
                  index === 2 && styles.rankBadgeBronze,
                ]}
              >
                <Text style={styles.dermIndex}>{index + 1}</Text>
              </View>
              <View style={styles.dermInfo}>
                <Text style={styles.dermName}>{derm.name}</Text>
                <Text style={styles.dermAddress}>{derm.address}</Text>
                <View style={styles.dermFooter}>
                  <View style={styles.statsContainer}>
                    <Text style={styles.statChip}>{derm.distance} km</Text>
                    <Text style={styles.statChip}>
                      {derm.rating > 0 ? `${derm.rating.toFixed(1)} ★` : 'No rating'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => openMapsNavigation(derm.lat || 0, derm.lng || 0, derm.name)}
                  >
                    <Text style={styles.navButtonText}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noResultsText}>No nearby dermatologists found yet.</Text>
        )}
        </View>

        {/* FOOTER BUTTON */}
        <TouchableOpacity
          style={[commonStyles.primaryButton, styles.backButton]}
          onPress={onBackToResults}
        >
          <Text style={commonStyles.buttonText}>← Back to Results</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 16,
  },
  mapContainer: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.inputBg,
  },
  map: {
    flex: 1,
    backgroundColor: colors.inputBg,
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
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  listHeader: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#d7e4ff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  listHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  listHeaderAccent: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 10,
    opacity: 0.22,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f2f66',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 13,
    color: '#365f9b',
  },
  dermCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dermCardPrimary: {
    borderColor: '#bfd2f6',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.tileBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  rankBadgeGold: {
    backgroundColor: '#ffe9a8',
  },
  rankBadgeSilver: {
    backgroundColor: '#e5e7eb',
  },
  rankBadgeBronze: {
    backgroundColor: '#f2d6bd',
  },
  dermIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  dermInfo: {
    flex: 1,
  },
  dermName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dermAddress: {
    fontSize: 13,
    color: colors.textTertiary,
    marginBottom: 8,
    lineHeight: 17,
  },
  dermFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.inputBg,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 18,
  },
  backButton: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 16,
    borderRadius: 10,
  },
});
