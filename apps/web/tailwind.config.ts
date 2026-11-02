import type { Config } from "tailwindcss";

import web from "@karakeep/tailwind-config/web";

const config = {
  content: [
    ...web.content,
    "lib/**/*.{ts,tsx}",
    "../../packages/shared-react/components/**/*.{ts,tsx}",
  ],
  presets: [web],
} satisfies Config;

export default config;
