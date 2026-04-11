import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../context/theme-context";
import { radius, type AppColors } from "../theme/tokens";

type ConversionBannerProps = {
  isLoggedIn: boolean;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
};

export function ConversionBanner({
  isLoggedIn,
  onPrimaryPress,
  onSecondaryPress,
}: ConversionBannerProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={isLoggedIn ? "notifications" : "person-add"}
          size={18}
          color={colors.brand}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {isLoggedIn ? "Activa alertas inteligentes" : "Desbloquea compra en 1 toque"}
        </Text>
        <Text style={styles.subtitle}>
          {isLoggedIn
            ? "Recibe avisos cuando salgan eventos que encajan contigo."
            : "Inicia sesión para guardar boletos, favoritos y entrar más rápido."}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onPrimaryPress}>
          <Text style={styles.primaryBtnText}>{isLoggedIn ? "Activar" : "Entrar"}</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onSecondaryPress}>
          <Text style={styles.secondaryBtnText}>
            {isLoggedIn ? "Editar gustos" : "Explorar"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrapper: {
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    copy: { gap: 2 },
    title: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      flexDirection: "row",
      gap: 8,
    },
    primaryBtn: {
      flex: 1,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      backgroundColor: colors.brand,
    },
    primaryBtnText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
    },
    secondaryBtn: {
      flex: 1,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    secondaryBtnText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
