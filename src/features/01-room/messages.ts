import { MAX_HEIGHT, MAX_SIDE, MIN_HEIGHT, MIN_SIDE, type RoomError } from "../../domain/01-room";

const wallName = (index: number) => `wall ${index + 1}`;

export function describeRoomError(error: RoomError): string {
  switch (error.reason) {
    case "too-few-corners":
      return "A room needs at least three corners.";
    case "not-a-number":
      return "Every corner and the height need a number.";
    case "duplicate-corner":
      return `Corners ${error.walls![0]! + 1} and ${error.walls![1]! + 1} are in the same place.`;
    case "wall-too-short":
      return `${wallName(error.walls![0]!).replace(/^w/, "W")} is shorter than ${MIN_SIDE} m.`;
    case "room-too-large":
      return `The room is wider than ${MAX_SIDE} m — that's a hall, not a room.`;
    case "walls-intersect":
      return `${wallName(error.walls![0]!).replace(/^w/, "W")} crosses ${wallName(error.walls![1]!)} — walls can't pass through each other. Move a corner.`;
    case "height-out-of-range":
      return `Ceiling height must be between ${MIN_HEIGHT} and ${MAX_HEIGHT} m.`;
  }
}

export const formatMetres = (value: number) => `${Number(value.toFixed(2))} m`;
