/**
 * StreamingText component that displays text with an optional animated cursor while streaming.
 */
import { Text, StyleSheet } from "react-native";
import { Colors, FontSize } from "@/constants/theme";

/**
 * Props for the StreamingText component.
 * @property text - The text content to display.
 * @property isComplete - Whether the stream has finished (hides cursor when true).
 */
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
