import { View, Text, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { useState } from "react";

export default function SettingsScreen() {
  const [approvalPolicy, setApprovalPolicy] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Section title="Agent">
          <SettingRow label="Model" value="Auto" />
          <SettingRow label="Effort" value="Auto" />
          <SettingRow label="Speed" value="Normal" />
        </Section>

        <Section title="Approval Policy">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>On-Request Approval</Text>
            <Switch
              value={approvalPolicy}
              onValueChange={setApprovalPolicy}
              trackColor="#333333"
              thumbColor={approvalPolicy ? "#2563eb" : "#666666"}
            />
          </View>
        </Section>

        <Section title="Connection">
          <SettingRow label="Status" value="Connected" />
          <SettingRow label="Encryption" value="E2EE Active" />
          <SettingRow label="Relay" value="Default" />
        </Section>

        <Section title="About">
          <SettingRow label="Version" value="0.1.0" />
          <SettingRow label="Protocol" value="CRC v1" />
        </Section>

        <TouchableOpacity style={styles.disconnectButton}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </View>
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111" },
  content: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#666666", textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 4 },
  row: { backgroundColor: "#1a1a1a", padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#222222" },
  rowLabel: { fontSize: 16, color: "#ffffff" },
  rowValue: { fontSize: 16, color: "#888888" },
  disconnectButton: { backgroundColor: "#1a1a1a", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 16, borderWidth: 1, borderColor: "#dc2626" },
  disconnectText: { color: "#dc2626", fontSize: 16, fontWeight: "600" },
});
