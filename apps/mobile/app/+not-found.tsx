import { Link, Stack } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../src/context/theme-context";
import { type AppColors } from "../src/theme/tokens";

export default function NotFoundScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: "Página no encontrada" }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Página no encontrada</Text>
        <Text style={styles.subtitle}>La ruta que buscas no existe.</Text>
        <Link href="/(tabs)" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Ir al inicio</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
      padding: 32,
    },
    emoji: { fontSize: 56 },
    title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center" },
    btn: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 8,
    },
    btnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  });
}
