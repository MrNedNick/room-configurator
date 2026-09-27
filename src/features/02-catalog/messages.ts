import type { CatalogError } from "../../domain/02-catalog";

export function describeCatalogError(error: CatalogError, name = "It", action: "add" | "turn" | "move" | null = null): string {
  switch (error.reason) {
    case "unknown-entry":
      return "That piece is no longer in the catalogue.";
    case "duplicate-entry":
    case "bad-size":
      return "The catalogue has a broken entry.";
    case "too-big-for-room":
      return `${name} is bigger than this room.`;
    case "no-free-spot":
      return `There is no free spot on the floor big enough for ${name.toLowerCase()}.`;
    case "outside-room":
      return action === "turn"
        ? `Turning ${name.toLowerCase()} here would push it through a wall — move it first.`
        : `That would put ${name.toLowerCase()} through a wall — it stays where it was.`;
  }
}
