import { View, Text, StyleSheet } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";

interface GitStatusInfo {
  branch: string;
  dirty: boolean;
  staged: number;
  modified: number;
  untracked: number;
}

interface GitStatusCardProps {
  status: GitStatusInfo;
}

export function GitStatusCard({ status }: GitStatusCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Branch</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{status.branch}</Text>
        </View>
      </View>
      {status.dirty && (
        <View style={styles.fileCounts}>
          {status.staged > 0 && (
            <View style={styles.fileCount}>
              <Text style={styles.stagedCount}>+{status.staged}</Text>
              <Text style={styles.fileCountLabel}>staged</Text>
            </View>
          )}
          {status.modified > 0 && (
            <View style={styles.fileCount}>
              <Text style={styles.modifiedCount}>~{status.modified}</Text>
              <Text style={styles.fileCountLabel}>modified</Text>
            </View>
          )}
          {status.untracked > 0 && (
            <View style={styles.fileCount}>
              <Text style={styles.untrackedCount}>?{status.untracked}</Text>
              <Text style={styles.fileCountLabel}>untracked</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  badge: {
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  fileCounts: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  fileCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  fileCountLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  stagedCount: { fontSize: FontSize.xs, color: Colors.success, fontWeight: "600" },
  modifiedCount: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: "600" },
  untrackedCount: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "600" },
});
