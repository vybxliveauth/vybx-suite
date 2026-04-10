import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "../theme/tokens";

export function EventCardSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.image} />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={[styles.line, styles.badge]} />
          <View style={[styles.line, styles.date]} />
        </View>
        <View style={[styles.line, styles.title]} />
        <View style={[styles.line, styles.titleShort]} />
        <View style={[styles.line, styles.location]} />
        <View style={[styles.line, styles.price]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: "100%", height: 220, backgroundColor: colors.surfaceStrong },
  body: { padding: spacing.md + 2, gap: spacing.sm + 1 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  line: { borderRadius: radius.pill, backgroundColor: "#2a3443" },
  badge: { width: 44, height: 18 },
  date: { width: 110, height: 12 },
  title: { width: "92%", height: 18, borderRadius: 8 },
  titleShort: { width: "66%", height: 18, borderRadius: 8 },
  location: { width: "58%", height: 13 },
  price: { width: 96, height: 14 },
});
