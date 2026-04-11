import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../context/theme-context";
import { spacing, typography, type AppColors } from "../theme/tokens";

type AppScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export function AppScreenHeader({
  title,
  subtitle,
  rightSlot,
}: AppScreenHeaderProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.container}>
      <View style={styles.copyBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot ? <View>{rightSlot}</View> : null}
    </Animated.View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      paddingBottom: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    copyBlock: { flex: 1, gap: spacing.xs },
    title: {
      color: colors.textPrimary,
      ...typography.display,
    },
    subtitle: {
      color: colors.textSecondary,
      ...typography.subtitle,
    },
  });
}
