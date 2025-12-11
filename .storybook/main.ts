import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(ts|tsx)",
    "../app/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {
      nextConfigPath: "../next.config.js",
    },
  },
  docs: {
    autodocs: true,
  },
  staticDirs: ["../public"],
};

export default config;
