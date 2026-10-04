import type { ExportError } from "../../domain/06-export";

export function describeExportError(error: ExportError): string {
  switch (error.reason) {
    case "not-json":
      return "That file isn't a saved room — it can't be read as one.";
    case "not-a-scene":
      return "That file is something else, not a room saved from here.";
    case "newer-version":
      return "That room was saved by a newer version of the planner. Reload the page to get it.";
    case "room-invalid":
      return error.room === "walls-intersect" && error.walls
        ? `The room in that file has walls that cross (wall ${error.walls[0]! + 1} and wall ${error.walls[1]! + 1}), so it can't be opened.`
        : "The room in that file isn't a valid room, so it can't be opened.";
    case "items-invalid":
      return "The furniture in that file is damaged, so the room can't be opened.";
  }
}
