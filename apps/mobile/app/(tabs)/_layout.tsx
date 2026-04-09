import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{label}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#0f0f0f" },
        headerTitleStyle: { color: "#fff", fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#0f0f0f",
          borderTopColor: "#222",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#555",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Eventos",
          tabBarLabel: "Eventos",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="🎟️" focused={focused} />
          ),
          headerTitle: "VybeTickets",
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Mis Tickets",
          tabBarLabel: "Mis Tickets",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="🎫" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="👤" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
