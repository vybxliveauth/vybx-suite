import { storiesOf } from "@storybook/react-native";
import { EventCard } from "../EventCard";
import type { PublicEvent } from "../../hooks/useEvents";
import { StoryTheme } from "./story-theme";

const featuredEvent: PublicEvent = {
  id: "evt-story-featured",
  title: "Bad Bunny en Altos de Chavon",
  description: "Una noche unica en vivo.",
  image:
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
  location: "La Romana, RD",
  date: new Date().toISOString(),
  status: "PUBLISHED",
  isFeatured: true,
  categoryId: "cat-conciertos",
  ticketTypes: [
    { id: "t1", name: "General", price: 2500, quantity: 1500, sold: 320 },
    { id: "t2", name: "VIP", price: 7800, quantity: 300, sold: 120 },
  ],
};

const noImageEvent: PublicEvent = {
  id: "evt-story-no-image",
  title: "Festival Gastronomico Santo Domingo",
  description: "Sabores, musica y cultura local.",
  image: null,
  location: "Distrito Nacional, RD",
  date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString(),
  status: "PUBLISHED",
  isFeatured: false,
  categoryId: "cat-festival",
  ticketTypes: [{ id: "t3", name: "Acceso", price: 0, quantity: 800, sold: 410 }],
};

storiesOf("Core/EventCard", module)
  .add("Featured / Dark", () => (
    <StoryTheme mode="dark">
      <EventCard event={featuredEvent} isFavorite />
    </StoryTheme>
  ))
  .add("No Image / Light", () => (
    <StoryTheme mode="light">
      <EventCard event={noImageEvent} isFavorite={false} />
    </StoryTheme>
  ));
