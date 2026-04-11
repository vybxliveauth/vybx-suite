import { storiesOf } from "@storybook/react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { lightColors, darkColors, type AppColors } from "../../theme/tokens";

function ColorSwatches({
  title,
  colors,
}: {
  title: string;
  colors: AppColors;
}) {
  const entries = Object.entries(colors) as Array<[keyof AppColors, string]>;
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {entries.map(([name, value]) => (
        <View key={String(name)} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: value }]} />
          <Text style={styles.label}>{String(name)}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

storiesOf("Foundations/Theme Tokens", module).add("Light + Dark palette", () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <ColorSwatches title="Light" colors={lightColors} />
    <ColorSwatches title="Dark" colors={darkColors} />
  </ScrollView>
));

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0f14" },
  content: { padding: 16, gap: 20 },
  group: {
    backgroundColor: "#11161d",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 12,
    gap: 8,
  },
  groupTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#334155",
    paddingTop: 8,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#64748b",
  },
  label: { color: "#cbd5e1", fontSize: 12, width: 108 },
  value: { color: "#94a3b8", fontSize: 12, fontFamily: "monospace" },
});
