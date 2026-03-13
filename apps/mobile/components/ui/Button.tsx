import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Colors, BorderRadius, FontSize, Spacing } from "@/constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "ghost";
  disabled?: boolean;
}

export function Button({ title, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const backgroundColor =
    variant === "primary" ? Colors.primary :
    variant === "danger" ? Colors.danger :
    "transparent";
  const borderColor = variant === "ghost" ? Colors.border : "transparent";

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, variant === "ghost" && { color: Colors.primary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
  },
  text: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
});
