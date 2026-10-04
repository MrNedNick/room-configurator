import { describe, expect, it } from "vitest";
import { FURNITURE } from "../../src/domain/02-catalog";
import { planFileName, planSvg, PLAN_SCALE } from "../../src/domain/06-export";
import { parseScene, sceneJson } from "../../src/adapters/scene-store";
import { crossingWallsFile, furnished } from "../fixtures/06-export/scenes";

describe("planSvg", () => {
  const svg = (() => {
    const result = planSvg(furnished.room, furnished.items, FURNITURE);
    if (!result.ok) throw new Error(result.error.reason);
    return result.value;
  })();

  it("draws the room to scale with its lengths, area and a scale bar", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`width="${5 * PLAN_SCALE + 140}"`);
    expect(svg.match(/>5\.00 m</g)).toHaveLength(2);
    expect(svg.match(/>4\.00 m</g)).toHaveLength(2);
    expect(svg).toContain("20 m² floor, 2.6 m ceiling");
    expect(svg).toContain(">1 m<");
  });

  it("draws every piece in its finish, with its name — names are escaped", () => {
    expect(svg.match(/class="piece"/g)).toHaveLength(2);
    expect(svg).toContain('fill="#9a6440"'); // tan leather
    expect(svg).toContain(">Double bed<");
    expect(svg).toContain("Kids &amp; guests &lt;room&gt;");
    expect(svg).not.toContain("<room>");
  });

  it("edge case, crossing walls: no plan, and the walls are named", () => {
    const bowTie = JSON.parse(crossingWallsFile).room;
    expect(planSvg(bowTie, [], FURNITURE)).toEqual({ ok: false, error: { kind: "export", reason: "room-invalid", room: "walls-intersect", walls: [0, 2] } });
  });
});

it("names files after the room", () => {
  expect(planFileName({ name: "Living room" })).toBe("living-room-plan.svg");
  expect(planFileName({ name: "Kids & guests <room>" }, "json")).toBe("kids-guests-room-scene.json");
  expect(planFileName({ name: "Вітальня" })).toBe("вітальня-plan.svg");
  expect(planFileName({ name: "!!!" })).toBe("room-plan.svg");
});

describe("scene files", () => {
  it("a scene written to a file reads back exactly", () => {
    expect(parseScene(sceneJson(furnished))).toEqual({ ok: true, value: furnished });
  });

  it.each([
    ["not JSON", "{room:", { reason: "not-json" }],
    ["a different file", JSON.stringify({ hello: "world" }), { reason: "not-a-scene" }],
    ["a newer version", JSON.stringify({ ...furnished, version: 9 }), { reason: "newer-version" }],
    ["crossing walls", crossingWallsFile, { reason: "room-invalid", room: "walls-intersect", walls: [0, 2] }],
    ["broken furniture", JSON.stringify({ ...furnished, items: [{ id: 1 }] }), { reason: "items-invalid" }],
  ])("says what is wrong with %s", (_label, text, error) => {
    expect(parseScene(text)).toEqual({ ok: false, error: { kind: "export", ...error } });
  });
});
