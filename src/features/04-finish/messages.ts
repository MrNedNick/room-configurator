import type { FinishError } from "../../domain/04-finish";

export function describeFinishError(error: FinishError): string {
  switch (error.reason) {
    case "unknown-material":
      return "That finish is no longer in the palette.";
    case "wrong-surface":
      return "That finish doesn't go on this surface.";
    case "unknown-item":
      return "That piece is no longer in the room.";
    case "bad-lighting":
      return "That lighting setting isn't available.";
  }
}
