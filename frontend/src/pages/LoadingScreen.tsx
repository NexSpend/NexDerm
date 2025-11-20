import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../utils/commonStyles";

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
{/* Text styles for LoadingScreen */}
      <Text style={styles.text}>Analyzing your Image...</Text>
      <Text style={styles.Subtext}>This may take a few moments</Text>
    </View>
  );
}
// Only styles unique to LoadingScreen
const styles = StyleSheet.create({
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
