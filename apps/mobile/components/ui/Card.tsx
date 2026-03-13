import { View, StyleSheet } from "react-native";
import { ReactNode } from "react";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "bordered";
}

export function Card({ children, variant = "default" }: CardProps) {
  return (
    <View style={[styles.card, variant === "bordered" && styles.bordered]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  bordered: {
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
});
