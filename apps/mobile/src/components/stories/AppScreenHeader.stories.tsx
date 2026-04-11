import { storiesOf } from "@storybook/react-native";
import { StyleSheet, Text } from "react-native";
import { AppScreenHeader } from "../AppScreenHeader";
import { StoryTheme } from "./story-theme";

storiesOf("Core/AppScreenHeader", module)
  .add("Dark", () => (
    <StoryTheme mode="dark">
      <AppScreenHeader
        title="Descubre conciertos"
        subtitle="Lo mejor de RD en una sola app"
        rightSlot={<Text style={styles.slot}>Buscar</Text>}
      />
    </StoryTheme>
  ))
  .add("Light", () => (
    <StoryTheme mode="light">
      <AppScreenHeader
        title="Descubre conciertos"
        subtitle="Lo mejor de RD en una sola app"
        rightSlot={<Text style={styles.slot}>Buscar</Text>}
      />
    </StoryTheme>
  ));

const styles = StyleSheet.create({
  slot: {
    fontSize: 13,
    fontWeight: "700",
  },
});
