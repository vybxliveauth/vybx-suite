import { storiesOf } from "@storybook/react-native";
import { NearbyCarousel } from "../NearbyCarousel";
import type { PublicEvent } from "../../hooks/useEvents";
import { StoryTheme } from "./story-theme";

const sampleEvents: PublicEvent[] = [
  {
    id: "evt-near-1",
    title: "Merengazo Live en la Zona Colonial",
    description: "Una noche para bailar.",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
    location: "Santo Domingo",
    date: new Date().toISOString(),
    status: "PUBLISHED",
    isFeatured: false,
    categoryId: "cat-merengue",
    ticketTypes: [{ id: "t1", name: "General", price: 1200, quantity: 300, sold: 88 }],
  },
  {
    id: "evt-near-2",
    title: "Sunset DJ Set en Punta Cana",
    description: "Música electrónica frente al mar.",
    image: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1200&q=80",
    location: "Punta Cana",
    date: new Date(Date.now() + 86400000).toISOString(),
    status: "PUBLISHED",
    isFeatured: false,
    categoryId: "cat-edm",
    ticketTypes: [{ id: "t2", name: "General", price: 1400, quantity: 400, sold: 130 }],
  },
];

storiesOf("Home/NearbyCarousel", module)
  .add("With Events", () => (
    <StoryTheme mode="dark">
      <NearbyCarousel
        city="Santo Domingo"
        events={sampleEvents}
        isLocating={false}
        onRequestLocation={() => undefined}
        onPressEvent={() => undefined}
      />
    </StoryTheme>
  ))
  .add("Request Location", () => (
    <StoryTheme mode="light">
      <NearbyCarousel
        city={null}
        events={[]}
        isLocating={false}
        onRequestLocation={() => undefined}
        onPressEvent={() => undefined}
      />
    </StoryTheme>
  ));
