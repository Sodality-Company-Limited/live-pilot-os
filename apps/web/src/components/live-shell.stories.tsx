import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiveShell } from "./live-shell";

const meta = {
  title: "Live OS/Role shells",
  component: LiveShell,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    role: {
      control: "radio",
      options: ["host", "ops"],
    },
  },
} satisfies Meta<typeof LiveShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Host: Story = {
  args: {
    role: "host",
  },
};

export const LiveOps: Story = {
  args: {
    role: "ops",
  },
};
