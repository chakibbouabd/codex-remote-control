import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";

interface GitAction {
  label: string;
  icon: string;
  destructive?: boolean;
  onPress: () => void;
}

interface GitActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: GitAction[];
}

export function GitActionSheet({ visible, onClose, actions }: GitActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Git Actions</Text>
          {actions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionButton, action.destructive && styles.destructiveButton]}
              onPress={() => {
                action.onPress();
                onClose();
              }}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionText, action.destructive && styles.destructiveText]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end", padding: Spacing.lg },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  title: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text, marginBottom: Spacing.md },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
    backgroundColor: "transparent",
  },
  actionIcon: { fontSize: 20, width: 28, textAlign: "center" },
  actionText: { fontSize: FontSize.md, color: Colors.text, marginLeft: Spacing.sm },
  destructiveButton: { backgroundColor: "rgba(220,38,38,0.1)" },
  destructiveText: { color: Colors.danger },
  cancelButton: {
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  cancelText: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
});
