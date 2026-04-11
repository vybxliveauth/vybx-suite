import { storiesOf } from "@storybook/react-native";
import { EventCardSkeleton } from "../EventCardSkeleton";
import { StoryTheme } from "./story-theme";

storiesOf("Core/EventCardSkeleton", module)
  .add("Dark", () => (
    <StoryTheme mode="dark">
      <EventCardSkeleton />
    </StoryTheme>
  ))
  .add("Light", () => (
    <StoryTheme mode="light">
      <EventCardSkeleton />
    </StoryTheme>
  ));
