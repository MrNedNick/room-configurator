import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4187/room-configurator/",
    browserName: "chromium",
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-light", use: { viewport: { width: 1440, height: 900 }, colorScheme: "light" } },
    { name: "desktop-dark-short", use: { viewport: { width: 1280, height: 600 }, colorScheme: "dark" } },
    { name: "tablet", use: { viewport: { width: 900, height: 700 }, colorScheme: "light" } },
    { name: "mobile-dark", use: { viewport: { width: 360, height: 740 }, colorScheme: "dark", hasTouch: true } },
    { name: "mobile-light", use: { viewport: { width: 390, height: 844 }, colorScheme: "light", hasTouch: true } },
    { name: "mobile-landscape", use: { viewport: { width: 740, height: 360 }, colorScheme: "dark", hasTouch: true } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npm run preview -- --host 127.0.0.1 --port 4187 --strictPort",
    url: "http://127.0.0.1:4187/room-configurator/",
    env: { PAGES_BASE_PATH: "/room-configurator/" },
    reuseExistingServer: !process.env.CI,
  },
});
