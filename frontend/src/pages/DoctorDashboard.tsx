import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { commonStyles, colors } from '../utils/commonStyles';
import { getPendingCases, PendingCase } from '../services/api';
import CaseReviewScreen from './CaseReviewScreen';

// Define props for the DoctorDashboard component
interface DoctorDashboardProps {
  onLogout: () => void; // Callback function for logging out
}

/**
 * DoctorDashboard Component
 * Displays a list of pending cases for review by a doctor.
 * Allows selection of a case to navigate to the CaseReviewScreen.
 */
export default function DoctorDashboard({ onLogout }: DoctorDashboardProps) {
  const [pendingCases, setPendingCases] = useState<PendingCase[]>([]); // State to store pending cases
  const [selectedCase, setSelectedCase] = useState<PendingCase | null>(null); // State for the currently selected case for review
  const [isLoading, setIsLoading] = useState(true); // Loading state for fetching cases
  const [isRefreshing, setIsRefreshing] = useState(false); // Refreshing state for pull-to-refresh
  const [searchQuery, setSearchQuery] = useState(''); // State for the search query

  // Function to fetch pending cases from the API
  const fetchPendingCases = useCallback(async () => {
    try {
      setIsLoading(true); // Set loading to true before fetching
      const cases = await getPendingCases(); // Call the API to get pending cases
      setPendingCases(cases); // Update state with fetched cases
    } catch (error) {
      console.error('Error fetching pending cases:', error);
      Alert.alert('Error', 'Failed to load pending cases. Please try again.');
    } finally {
      setIsLoading(false); // Set loading to false after fetching
      setIsRefreshing(false); // Set refreshing to false
    }
  }, []);

  // Fetch pending cases on component mount
  useEffect(() => {
    fetchPendingCases();
  }, [fetchPendingCases]);

  // Handle pull-to-refresh action
  const onRefresh = useCallback(() => {
    setIsRefreshing(true); // Set refreshing to true
    fetchPendingCases(); // Re-fetch cases
  }, [fetchPendingCases]);

  // Callback when a case is reviewed and submitted
  const handleCaseReviewed = () => {
    setSelectedCase(null); // Clear selected case to go back to the list
    fetchPendingCases(); // Refresh the list of pending cases
  };

  // Filter cases based on search query
  const filteredCases = pendingCases.filter(
    (item) =>
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prediction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user_name &&
        item.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.user_email &&
        item.user_email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Render the CaseReviewScreen if a case is selected
  if (selectedCase) {
    return (
      <CaseReviewScreen
        selectedCase={selectedCase}
        onBack={handleCaseReviewed} // Pass callback to refresh list after review
      />
    );
  }

  // Main Doctor Dashboard UI
  return (
    <SafeAreaView style={commonStyles.doctorDashboardContainer}>
      {/* Header Section */}
      <View style={commonStyles.doctorDashboardHeader}>
        <Text style={commonStyles.doctorDashboardTitle}>Doctor Portal</Text>
        <TouchableOpacity style={commonStyles.logoutButton} onPress={onLogout}>
          <Text style={commonStyles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Body Section */}
      <View style={commonStyles.caseListContainer}>
        <Text style={[commonStyles.subtitle, { marginBottom: 15, color: colors.textPrimary }]}>
          Pending Cases for Review
        </Text>

        <TextInput
          style={{
            padding: 10,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            marginBottom: 15,
          }}
          placeholder="Search by Name, Email, or Diagnosis..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {isLoading && pendingCases.length === 0 ? (
          // Show loading indicator if initial load
          <ActivityIndicator size="large" color={colors.primary} />
        ) : filteredCases.length === 0 ? (
          // Show message if no pending cases
          <Text style={commonStyles.caseCardText}>No pending cases at the moment.</Text>
        ) : (
          // Render FlatList of pending cases
          <FlatList
            data={filteredCases}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={commonStyles.caseCard}
                onPress={() => setSelectedCase(item)} // Set selected case on tap
              >
                <Text style={commonStyles.caseCardTitle}>{item.user_name || 'N/A'}</Text>
                <Text style={commonStyles.caseCardText}>
                  {item.user_email || 'N/A'}
                </Text>
                <Text style={commonStyles.caseCardText}>
                  AI Prediction: {item.prediction}
                </Text>
                <Text style={commonStyles.caseCardText}>
                  Confidence: <Text style={commonStyles.caseCardConfidence}>{(item.confidence * 100).toFixed(2)}%</Text>
                </Text>
                <Text style={commonStyles.caseCardText}>
                  Created At: {new Date(item.created_at).toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}
            refreshControl={
              // Enable pull-to-refresh functionality
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>

      {/* Footer Section */}
      <View style={commonStyles.footer}>
        <Text style={commonStyles.disclaimer}>
          Review cases carefully. Your diagnosis is crucial.
        </Text>
      </View>
    </SafeAreaView>
  );
}
