import { configure, getStorybookUI } from "@storybook/react-native";
import "@storybook/addon-ondevice-actions/register";
import "@storybook/addon-ondevice-controls/register";

configure(() => {
  require("../src/components/stories/AppScreenHeader.stories");
  require("../src/components/stories/ConversionBanner.stories");
  require("../src/components/stories/DiscoveryHero.stories");
  require("../src/components/stories/EventCard.stories");
  require("../src/components/stories/EventCardSkeleton.stories");
  require("../src/components/stories/NearbyCarousel.stories");
  require("../src/components/stories/ThemeTokens.stories");
}, module);

const StorybookUIRoot = getStorybookUI({
  shouldPersistSelection: true,
});

export default StorybookUIRoot;
