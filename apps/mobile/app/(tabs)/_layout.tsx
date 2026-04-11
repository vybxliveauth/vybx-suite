import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/context/theme-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors, resolvedTheme } = useAppTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: isDark ? "rgba(11,15,20,0.94)" : "rgba(255,255,255,0.96)",
          borderColor: isDark ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.08)",
          borderWidth: 1,
          borderTopWidth: 1,
          borderRadius: 20,
          marginHorizontal: 12,
          marginBottom: 8,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
          shadowColor: "#000000",
          shadowOpacity: isDark ? 0.36 : 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
        tabBarItemStyle: { paddingVertical: 2, borderRadius: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoritos",
          tabBarLabel: "Favoritos",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Buscar",
          tabBarLabel: "Buscar",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Mis Boletos",
          tabBarLabel: "Boletos",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "ticket" : "ticket-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Mi Cuenta",
          tabBarLabel: "Mi Cuenta",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
