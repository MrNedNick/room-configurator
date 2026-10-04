import { type Page } from "@playwright/test";

export async function showPanel(page: Page, name: "Room" | "Furniture" | "Finish & light") {
  const nav = page.getByRole("navigation", { name: "Settings panels" });
  if (await nav.isVisible()) await nav.getByRole("button", { name, exact: true }).click();
}

