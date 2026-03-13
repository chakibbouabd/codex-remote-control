import { Text, StyleSheet } from "react-native";
import { Colors, FontSize } from "@/constants/theme";

interface StreamingTextProps {
  text: string;
  isComplete?: boolean;
}

export function StreamingText({ text, isComplete = false }: StreamingTextProps) {
  return (
    <Text style={styles.text} numberOfLines={isComplete ? undefined : 0}>
      {text}
      {!isComplete && <Text style={styles.cursor}>▊</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  cursor: {
    color: Colors.primary,
  },
});
