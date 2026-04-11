import type { ComponentType, ReactNode } from "react";

declare module "@storybook/react-native" {
  export const configure: (
    loadStories: () => void,
    module: NodeModule,
  ) => void;
  export const getStorybookUI: (options?: {
    shouldPersistSelection?: boolean;
  }) => ComponentType;
  export const storiesOf: (
    kind: string,
    module: NodeModule,
  ) => {
    add: (storyName: string, storyFn: () => ReactNode) => ReturnType<typeof storiesOf>;
  };
}

declare module "@storybook/addon-ondevice-actions/register";
declare module "@storybook/addon-ondevice-controls/register";
