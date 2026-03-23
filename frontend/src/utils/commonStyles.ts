import { StyleSheet } from 'react-native';

export const colors = {
  primary: "#004aad",
  secondary: "#007b83",
  background: "#f7f9fc",
  white: "#ffffff",
  cardBackground: "#ffffff",
  textPrimary: "#1f2937",
  textSecondary: "#4b5563",
  textTertiary: "#6b7280",
  textPlaceholder: "#9ca3af",
  border: "#cbd5e1",
  borderLight: "#e5e7eb",
  inputBg: "#f9fafb",
  tileBg: "#e0e7ff",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  errorText: "#dc2626",
  secondaryButtonBg: "#f3f4f6",
  secondaryButtonBorder: "#d1d5db",
};

export const commonStyles = StyleSheet.create({
  // Root Container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // HEADER (Reusable)
  header: {
    alignItems: "center",
    paddingTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // BODY (Reusable)
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // Cards (Reusable)
  card: {
    width: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardWide: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Image Preview Box (Reusable)
  imageBox: {
    width: 280,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageBoxDashed: {
    borderStyle: "dashed",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewPlaceholder: {
    color: colors.textPlaceholder,
    fontSize: 16,
  },

  // Input Fields (Reusable)
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.inputBg,
    color: colors.textPrimary,
  },

  // Buttons (Reusable)
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  tertiaryButton: {
    backgroundColor: colors.secondaryButtonBg,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.secondaryButtonBorder,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  buttonTextSecondary: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },

  // Links (Reusable)
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },

  // Section Labels (Reusable)
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },

  // FOOTER (Reusable)
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
  },

  // Doctor Portal Specific Styles
  doctorDashboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  doctorDashboardHeader: {
    padding: 20,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  doctorDashboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 10, // Adjust for logout button
  },
  doctorDashboardSubtitle: {
    fontSize: 16,
    color: colors.white,
    marginTop: 4,
  },
  caseListContainer: {
    flex: 1,
    padding: 10,
  },
  caseCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  caseCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  caseCardText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  caseCardConfidence: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  // Case Review Screen Styles
  reviewDetailText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  reviewTextInput: {
    backgroundColor: colors.inputBg, // Changed from inputBackground to inputBg as per commonStyles
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    borderColor: colors.borderLight,
    borderWidth: 1,
    marginBottom: 15,
  },
  reviewTextInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top', // For Android to align text at the top
  },
  reviewButtonContainer: {
    marginTop: 20,
  },
  backButtonReview: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonReviewText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: colors.secondary,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 14,
  },
});