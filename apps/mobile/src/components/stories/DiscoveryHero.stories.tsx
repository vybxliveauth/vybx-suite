import { storiesOf } from "@storybook/react-native";
import { DiscoveryHero } from "../DiscoveryHero";
import type { PublicEvent } from "../../hooks/useEvents";
import { StoryTheme } from "./story-theme";

const sampleEvent: PublicEvent = {
  id: "evt-story-hero",
  title: "Noches del Malecon Live Session",
  description: "Top artistas urbanos y tropicales en vivo.",
  image:
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
  location: "Santo Domingo, RD",
  date: new Date().toISOString(),
  status: "PUBLISHED",
  isFeatured: true,
  categoryId: "cat-live",
  ticketTypes: [{ id: "t1", name: "General", price: 1800, quantity: 1500, sold: 640 }],
};

storiesOf("Home/DiscoveryHero", module)
  .add("With Event", () => (
    <StoryTheme mode="dark">
      <DiscoveryHero
        event={sampleEvent}
        city="Santo Domingo"
        onPressPrimary={() => undefined}
        onPressSecondary={() => undefined}
      />
    </StoryTheme>
  ))
  .add("Fallback", () => (
    <StoryTheme mode="light">
      <DiscoveryHero
        event={null}
        city=""
        onPressPrimary={() => undefined}
        onPressSecondary={() => undefined}
      />
    </StoryTheme>
  ));
