import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, SafeAreaView } from "react-native";
import { colors } from "../utils/commonStyles";
import AccountButton from "./AccountButton";

interface LoadingScreenProps {
  onAccountPress?: () => void;
  userName?: string;
}

export default function LoadingScreen({ onAccountPress, userName = 'User' }: LoadingScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {onAccountPress && <AccountButton onPress={onAccountPress} userName={userName} />}
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        {/* Text styles for LoadingScreen */}
        <Text style={styles.text}>Analyzing your Image...</Text>
        <Text style={styles.Subtext}>This may take a few moments</Text>
      </View>
    </SafeAreaView>
  );
}
// Only styles unique to LoadingScreen
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#004aad",
  },
  Subtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
  },
});
