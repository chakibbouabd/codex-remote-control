/**
 * Compact Badge component for displaying status labels with color variants.
 */
import { View, Text, StyleSheet } from "react-native";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";

/**
 * Props for the Badge component.
 * @property label - The text displayed inside the badge.
 * @property variant - Color variant controlling the badge background.
 */
interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  const backgroundColor =
    variant === "success" ? Colors.success :
    variant === "warning" ? Colors.warning :
    variant === "danger" ? Colors.danger :
    Colors.primary;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
});
