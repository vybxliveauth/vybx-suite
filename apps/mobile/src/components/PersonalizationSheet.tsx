import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Category } from "../hooks/useCategories";
import { useAppTheme } from "../context/theme-context";
import { radius, type AppColors } from "../theme/tokens";

type PersonalizationSheetProps = {
  visible: boolean;
  categories: Category[];
  initialCity: string;
  initialVibeCategoryIds: string[];
  onClose: () => void;
  onSave: (input: { city: string; vibeCategoryIds: string[] }) => Promise<void>;
};

export function PersonalizationSheet({
  visible,
  categories,
  initialCity,
  initialVibeCategoryIds,
  onClose,
  onSave,
}: PersonalizationSheetProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [city, setCity] = useState(initialCity);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialVibeCategoryIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCity(initialCity);
    setSelectedIds(initialVibeCategoryIds);
  }, [initialCity, initialVibeCategoryIds, visible]);

  const visibleCategories = useMemo(() => categories.slice(0, 12), [categories]);

  const toggleCategory = (id: string) => {
    setSelectedIds((current) => {
      const alreadySelected = current.includes(id);
      if (alreadySelected) {
        return current.filter((value) => value !== id);
      }
      if (current.length >= 6) {
        return current;
      }
      return [...current, id];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ city, vibeCategoryIds: selectedIds });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Hazla tuya</Text>
          <Text style={styles.subtitle}>
            Cuéntanos tu zona y qué te gusta para priorizar mejores eventos.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Ciudad principal</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Ej. Santo Domingo"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tus vibes (hasta 6)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsRow}
            >
              {visibleCategories.map((category) => {
                const active = selectedIds.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
                    style={[styles.tag, active && styles.tagActive]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.footerRow}>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.btnGhostText}>Ahora no</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, saving && styles.btnDisabled]}
              onPress={() => {
                void handleSave();
              }}
              disabled={saving}
            >
              <Text style={styles.btnPrimaryText}>
                {saving ? "Guardando..." : "Guardar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(2,6,23,0.42)",
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 26,
      gap: 12,
    },
    handle: {
      alignSelf: "center",
      width: 42,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 4,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 23,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    field: {
      gap: 8,
    },
    label: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    input: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    tagsRow: {
      gap: 8,
      paddingVertical: 2,
    },
    tag: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagActive: {
      borderColor: colors.brand,
      backgroundColor: colors.brand,
    },
    tagText: {
      color: colors.textSoft,
      fontSize: 13,
      fontWeight: "700",
    },
    tagTextActive: {
      color: colors.white,
    },
    footerRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 2,
    },
    btn: {
      flex: 1,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },
    btnGhost: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    btnGhostText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    btnPrimary: {
      backgroundColor: colors.brand,
    },
    btnPrimaryText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
    btnDisabled: {
      opacity: 0.7,
    },
  });
}
