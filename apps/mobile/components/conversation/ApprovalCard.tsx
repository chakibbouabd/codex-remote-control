/**
 * ApprovalCard component for requesting user confirmation of a shell command.
 */
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";

/**
 * Props for the ApprovalCard component.
 * @property command - The shell command requiring approval.
 * @property onAccept - Callback invoked when the user accepts.
 * @property onDecline - Callback invoked when the user declines.
 */
interface ApprovalCardProps {
  command: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function ApprovalCard({ command, onAccept, onDecline }: ApprovalCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Approval Required</Text>
      <View style={styles.commandBox}>
        <Text style={styles.command} numberOfLines={5}>{command}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={onAccept}>
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={onDecline}>
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.warning,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  commandBox: {
    backgroundColor: "#0a0a0a",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  command: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  declineButton: {
    backgroundColor: Colors.surfaceBorder,
  },
  buttonText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
});
