import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  ThemeProvider,
  useAppTheme,
  type ThemeMode,
} from "../../context/theme-context";

type StoryThemeProps = {
  mode: ThemeMode;
  children: ReactNode;
};

function ThemeSetter({ mode, children }: StoryThemeProps) {
  const { setMode, colors } = useAppTheme();

  useEffect(() => {
    void setMode(mode);
  }, [mode, setMode]);

  return <View style={[styles.frame, { backgroundColor: colors.bg }]}>{children}</View>;
}

export function StoryTheme({ mode, children }: StoryThemeProps) {
  return (
    <ThemeProvider>
      <ThemeSetter mode={mode}>{children}</ThemeSetter>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    padding: 16,
  },
});
