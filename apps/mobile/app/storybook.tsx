import { Link, Stack } from "expo-router";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../src/context/theme-context";
import { type AppColors } from "../src/theme/tokens";

const isStorybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK === "1";

const StorybookUIRoot = isStorybookEnabled
  ? (require("../.rnstorybook").default as ComponentType)
  : null;

export default function StorybookScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (isStorybookEnabled && StorybookUIRoot) {
    return <StorybookUIRoot />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "UI Lab (Storybook)" }} />
      <Text style={styles.title}>Storybook desactivado</Text>
      <Text style={styles.subtitle}>
        Ejecuta Expo con `EXPO_PUBLIC_STORYBOOK=1` para abrir el laboratorio de UI.
      </Text>
      <Link href="/(tabs)/profile" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Volver a Mi Cuenta</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
      padding: 24,
      gap: 12,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: "center",
    },
    button: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    buttonText: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 14,
    },
  });
}
