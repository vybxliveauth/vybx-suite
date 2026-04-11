import { storiesOf } from "@storybook/react-native";
import { ConversionBanner } from "../ConversionBanner";
import { StoryTheme } from "./story-theme";

storiesOf("Home/ConversionBanner", module)
  .add("Guest", () => (
    <StoryTheme mode="dark">
      <ConversionBanner
        isLoggedIn={false}
        onPrimaryPress={() => undefined}
        onSecondaryPress={() => undefined}
      />
    </StoryTheme>
  ))
  .add("Logged In", () => (
    <StoryTheme mode="light">
      <ConversionBanner
        isLoggedIn
        onPrimaryPress={() => undefined}
        onSecondaryPress={() => undefined}
      />
    </StoryTheme>
  ));
