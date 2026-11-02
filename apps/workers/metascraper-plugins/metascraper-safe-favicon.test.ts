import metascraper from "metascraper";
import { describe, expect, test, vi } from "vitest";

vi.mock("../network", () => ({
  getRandomProxy: vi.fn((proxies: string[]) => proxies[0]),
}));

vi.mock("@karakeep/shared/config", () => ({
  default: {
    proxy: {},
  },
}));

import metascraperSafeFavicon from "./metascraper-safe-favicon";

describe("metascraperSafeFavicon", () => {
  test("returns favicon candidates discovered by the upstream plugin without fetching them", async () => {
    const parser = metascraper([metascraperSafeFavicon()]);
    const meta = await parser({
      url: "https://example.com/articles/one",
      html: `
        <html>
          <head>
            <link rel="icon" href="/icon-64.png" sizes="64x64">
            <link rel="apple-touch-icon" href="/icon-256.png" sizes="256x256">
          </head>
        </html>
      `,
      validateUrl: false,
    });

    expect(meta.logo).toBe("https://example.com/icon-256.png");
  });

  test("prefers <link rel='icon'> over larger <meta name='msapplication-TileImage'>", async () => {
    const parser = metascraper([metascraperSafeFavicon()]);
    const meta = await parser({
      url: "https://globe.adsbexchange.com/",
      html: `
        <html>
          <head>
            <link rel="icon" href="images/cropped-Stealth-1-192x192.png" sizes="192x192" />
            <meta name="msapplication-TileImage" content="images/cropped-Stealth-1-270x270.png" />
          </head>
        </html>
      `,
      validateUrl: false,
    });

    expect(meta.logo).toBe(
      "https://globe.adsbexchange.com/images/cropped-Stealth-1-192x192.png",
    );
  });
});
