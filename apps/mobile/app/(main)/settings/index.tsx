import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";

type ApprovalPolicy = "on-request" | "never";

const MODELS = ["Auto", "o4-mini", "o3", "gpt-4.1"];
const EFFORTS = ["Auto", "Low", "Medium", "High"];

export default function SettingsScreen() {
  const [model, setModel] = useState("Auto");
  const [effort, setEffort] = useState("Auto");
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>("on-request");
  const [speedMode, setSpeedMode] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Section title="Agent">
          <PickerRow
            label="Model"
            value={model}
            options={MODELS}
            onValueChange={setModel}
          />
          <PickerRow
            label="Effort"
            value={effort}
            options={EFFORTS}
            onValueChange={setEffort}
          />
          <ToggleRow
            label="Fast Mode"
            description="Lower latency, may reduce quality"
            value={speedMode}
            onValueChange={setSpeedMode}
          />
        </Section>

        <Section title="Approval Policy">
          <View style={styles.policyButtons}>
            {(["on-request", "never"] as ApprovalPolicy[]).map((policy) => (
              <TouchableOpacity
                key={policy}
                style={[styles.policyButton, approvalPolicy === policy && styles.policyButtonActive]}
                onPress={() => setApprovalPolicy(policy)}
              >
                <Text style={[styles.policyText, approvalPolicy === policy && styles.policyTextActive]}>
                  {policy === "on-request" ? "On-Request" : "Full Access"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Connection">
          <InfoRow label="Status" value="Connected" />
          <InfoRow label="Encryption" value="E2EE Active" />
          <InfoRow label="Relay" value="Default" />
        </Section>

        <Section title="About">
          <InfoRow label="Version" value="0.1.0" />
          <InfoRow label="Protocol" value="CRC v1" />
        </Section>

        <TouchableOpacity style={styles.disconnectButton}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({ label, description, value, onValueChange }: { label: string; description?: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.toggleInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDescription}>{description}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor="#333333" thumbColor={value ? "#2563eb" : "#666666"} />
    </View>
  );
}

function PickerRow({ label, value, options, onValueChange }: { label: string; value: string; options: string[]; onValueChange: (v: string) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.picker}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.pickerOption, value === option && styles.pickerOptionActive]}
            onPress={() => onValueChange(option)}
          >
            <Text style={[styles.pickerText, value === option && styles.pickerTextActive]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textTertiary, textTransform: "uppercase" as const, marginBottom: Spacing.sm },
  row: { backgroundColor: Colors.surface, padding: Spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  rowLabel: { fontSize: FontSize.md, color: Colors.text },
  rowDescription: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  rowValue: { fontSize: FontSize.md, color: Colors.textSecondary },
  toggleInfo: { flex: 1, marginRight: Spacing.md },
  picker: { flexDirection: "row", gap: Spacing.xs, backgroundColor: "#0a0a0a", borderRadius: BorderRadius.sm, padding: 2 },
  pickerOption: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  pickerOptionActive: { backgroundColor: Colors.primary },
  pickerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  pickerTextActive: { color: Colors.text, fontWeight: "600" },
  policyButtons: { flexDirection: "row", gap: Spacing.sm },
  policyButton: { flex: 1, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  policyButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  policyText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  policyTextActive: { color: Colors.text, fontWeight: "600" },
  disconnectButton: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: "center", marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.danger },
  disconnectText: { color: Colors.danger, fontSize: FontSize.md, fontWeight: "600" },
});
