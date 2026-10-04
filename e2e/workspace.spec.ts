import { expect, test, type Page } from "@playwright/test";

import { showPanel } from "./helpers";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto("./", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Room configurator" })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  (page as Page & { workspaceErrors: string[] }).workspaceErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { workspaceErrors: string[] }).workspaceErrors).toEqual([]);
});

test("only settings scroll, while the scene and header stay inside the viewport", async ({ page }) => {
  await showPanel(page, "Furniture");
  const scene = page.getByTestId("view");
  const before = await scene.boundingBox();
  const panel = page.locator(".catalog");
  await panel.hover();
  await page.mouse.wheel(0, 900);
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await scene.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => ({
    top: scrollY,
    horizontal: document.documentElement.scrollWidth > innerWidth,
  }))).toEqual({ top: 0, horizontal: false });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  await page.locator(".topbar").hover();
  await page.mouse.wheel(0, 900);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const viewport = page.viewportSize()!;
  expect(before!.y + before!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(before!.height).toBeGreaterThan(70);
  await showPanel(page, "Room");
  await page.getByRole("button", { name: "Room file (JSON)", exact: true }).scrollIntoViewIfNeeded();
  expect(await scene.boundingBox()).toEqual(before);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("panels remain reachable through resizing, and the room survives reload and file transfer", async ({ page }) => {
  await showPanel(page, "Room");
  await page.getByRole("button", { name: "L-shape", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Studio workspace");
  await showPanel(page, "Furniture");
  await page.getByRole("button", { name: "Add Three-seat sofa", exact: true }).click();
  await page.getByRole("button", { name: "Add Floor lamp", exact: true }).click();
  await showPanel(page, "Finish & light");
  await page.getByRole("radio", { name: "Walnut boards", exact: true }).click();
  await page.getByRole("radio", { name: "Evening", exact: true }).click();
  await showPanel(page, "Room");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Room file (JSON)", exact: true }).click();
  const download = await pending;
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Studio workspace");
  await page.getByLabel("Open a room file", { exact: true }).setInputFiles((await download.path())!);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await showPanel(page, "Furniture");
  await expect(page.getByRole("button", { name: "Remove Three-seat sofa", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 740 });
  await showPanel(page, "Finish & light");
  await expect(page.getByRole("radio", { name: "Walnut boards", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".room-editor")).toBeVisible();
  await expect(page.locator(".catalog")).toBeVisible();
  await expect(page.locator(".finish")).toBeVisible();
});
