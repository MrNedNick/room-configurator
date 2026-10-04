import { expect, test, type Page } from "@playwright/test";
import { showPanel } from "./helpers";

async function position(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("room-configurator:scene")!).items[0].transform as { x: number; z: number; rotation: number });
}

async function imageDifference(page: Page, first: Buffer, last: Buffer) {
  return page.evaluate(async ({ first, last }) => {
    const pixels = async (encoded: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height).data;
    };
    const [a, b] = await Promise.all([pixels(first), pixels(last)]);
    if (a.length !== b.length) return 1;
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 30) changed++;
    }
    return changed / (a.length / 4);
  }, { first: first.toString("base64"), last: last.toString("base64") });
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto("./", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  (page as Page & { workspaceErrors: string[] }).workspaceErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect((page as Page & { workspaceErrors: string[] }).workspaceErrors).toEqual([]);
});

test("zoom is preserved when renaming, and Reset view restores either projection", async ({ page }) => {
  await page.getByRole("button", { name: "Dimensions", exact: true }).click();
  for (const name of ["Plan", "3D"]) {
    await page.getByRole("button", { name, exact: true }).click();
    const canvas = page.locator("canvas");
    await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => Math.abs(element.width - element.clientWidth * devicePixelRatio))).toBeLessThanOrEqual(1);
    await canvas.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const before = await canvas.screenshot();
    await canvas.hover();
    await page.mouse.wheel(0, -350);
    await expect.poll(async () => imageDifference(page, before, await canvas.screenshot())).toBeGreaterThan(0.05);
    await showPanel(page, "Room");
    await page.getByLabel("Name", { exact: true }).fill(`Camera ${name}`);
    await expect.poll(async () => imageDifference(page, before, await canvas.screenshot())).toBeGreaterThan(0.05);
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await expect.poll(async () => imageDifference(page, before, await canvas.screenshot())).toBeLessThan(0.02);
  }
});

test("every drag cancellation keeps the piece and allows the next drag and camera zoom", async ({ page }) => {
  await showPanel(page, "Furniture");
  await page.getByRole("button", { name: "Add Three-seat sofa", exact: true }).click();
  const original = await position(page);
  expect(original).toMatchObject({ x: 2.5, z: 2 });
  const canvas = page.locator("canvas");
  const box = (await canvas.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const dx = Math.min(50, box.height * 0.12);
  for (const cancel of ["pointercancel", "lostpointercapture", "blur", "Escape"]) {
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    await page.mouse.move(centre.x + dx, centre.y, { steps: 6 });
    if (cancel === "Escape") await page.keyboard.press("Escape");
    else if (cancel === "blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    else await canvas.dispatchEvent(cancel, { pointerId: 1 });
    await page.mouse.up();
    expect(await position(page)).toEqual(original);
  }
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + dx, centre.y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await position(page)).x).toBeGreaterThan(original.x);
  const before = await canvas.screenshot();
  await canvas.hover();
  await page.mouse.wheel(0, -200);
  await expect.poll(async () => imageDifference(page, before, await canvas.screenshot())).toBeGreaterThan(0.05);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
