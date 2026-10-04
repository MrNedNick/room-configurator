import { bounds, floorArea, validateRoom, type Point, type Room } from "../01-room";
import { footprint, type CatalogEntry, type Item } from "../02-catalog";
import { lookOf } from "../04-finish";
import { formatLength, wallLabels } from "../05-measure";
import { err, ok, type Result } from "../result";
import { exportError, type ExportError } from "./errors";

/** Pixels per metre in the drawing: a 5 m room is 500 px wide, sharp when printed on A4. */
export const PLAN_SCALE = 100;
const MARGIN = 70;
const HEADER = 56;

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fixed = (value: number) => Math.round(value * 10) / 10;

/**
 * The floor plan as an SVG document: walls with their lengths, every piece as its footprint with its
 * name, the floor area and a 1 m scale bar. A room whose walls cross has no plan — that is an error,
 * not a drawing of a bow-tie.
 */
export function planSvg(room: Room, items: readonly Item[], catalog: readonly CatalogEntry[]): Result<string, ExportError> {
  const valid = validateRoom(room);
  if (!valid.ok) return err(exportError("room-invalid", { room: valid.error.reason, ...(valid.error.walls ? { walls: valid.error.walls } : {}) }));
  const box = bounds(room);
  const width = Math.ceil(box.width * PLAN_SCALE + 2 * MARGIN);
  const height = Math.ceil(box.depth * PLAN_SCALE + 2 * MARGIN + HEADER);
  const at = (p: Point) => `${fixed((p.x - box.min.x) * PLAN_SCALE + MARGIN)},${fixed((p.z - box.min.z) * PLAN_SCALE + MARGIN + HEADER)}`;
  const xy = (p: Point) => at(p).split(",");

  const pieces = items.flatMap((item) => {
    const entry = catalog.find((candidate) => candidate.id === item.catalogId);
    if (!entry) return [];
    const outline = footprint(entry, item.transform);
    const [cx, cz] = xy({ x: item.transform.x, z: item.transform.z });
    return [
      `  <g class="piece">`,
      `    <polygon points="${outline.map(at).join(" ")}" fill="${lookOf(item, entry).colour}" fill-opacity="0.75" stroke="#2b2925" stroke-width="1.5"/>`,
      `    <text x="${cx}" y="${cz}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#1b1a17">${escape(item.name)}</text>`,
      `  </g>`,
    ];
  });

  const labels = wallLabels(room).map((label) => {
    const [x, y] = xy(label.at);
    return `  <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="#3d3a34">${formatLength(label.length)}</text>`;
  });

  const barY = height - 24;
  // Bottom right, clear of the bottom wall's length on the left.
  const barX = width - MARGIN - PLAN_SCALE - 28;
  const title = `${room.name} — ${(Math.round(floorArea(room) * 10) / 10).toString()} m² floor, ${room.height} m ceiling`;
  return ok(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, -apple-system, sans-serif">`,
      `  <title>${escape(room.name)} — floor plan</title>`,
      `  <rect width="100%" height="100%" fill="#ffffff"/>`,
      `  <text x="${MARGIN}" y="34" font-size="18" font-weight="600" fill="#1b1a17">${escape(title)}</text>`,
      `  <polygon points="${room.corners.map(at).join(" ")}" fill="#f4efe6" stroke="#2b2925" stroke-width="5" stroke-linejoin="miter"/>`,
      ...pieces,
      ...labels,
      `  <g class="scale">`,
      `    <line x1="${barX}" y1="${barY}" x2="${barX + PLAN_SCALE}" y2="${barY}" stroke="#2b2925" stroke-width="2"/>`,
      `    <text x="${barX + PLAN_SCALE + 8}" y="${barY}" dominant-baseline="middle" font-size="12" fill="#3d3a34">1 m</text>`,
      `  </g>`,
      `</svg>`,
      "",
    ].join("\n"),
  );
}

/** "Living room" → "living-room-plan.svg": a file name that sorts and travels well. */
export function planFileName(room: Pick<Room, "name">, extension: "svg" | "json" = "svg"): string {
  const slug = room.name.toLowerCase().normalize("NFKD").replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "") || "room";
  return `${slug}-${extension === "svg" ? "plan" : "scene"}.${extension}`;
}
