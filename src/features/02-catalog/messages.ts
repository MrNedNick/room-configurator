import type { CatalogError } from "../../domain/02-catalog";

export function describeCatalogError(error: CatalogError, name = "It"): string {
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
      return `Turning ${name.toLowerCase()} here would push it through a wall — move it first.`;
  }
}
