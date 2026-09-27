// @vitest-environment jsdom
/**
 * The first scenario end to end through the real UI: pick a room, change it, break it, fix it, switch
 * the camera, reload — and the geometry the 3D view is built from matches what the form says.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import { bounds, cameraPreset, floorArea, validateRoom, walls } from "../../src/domain/01-room";
import { PRESETS } from "../../src/features/01-room";

const KEY = "room-configurator:scene";
const saved = () => JSON.parse(localStorage.getItem(KEY)!).room;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("room and camera — integration", () => {
  it("golden path: L-shape, widen it, switch to plan, reload — same room", () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "L-shape" }));
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "8" } });
    expect(screen.getByRole("status").textContent).toMatch(/33 m² floor · 6 walls/);

    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    expect(screen.getByRole("button", { name: "Plan" }).getAttribute("aria-pressed")).toBe("true");
    first.unmount();

    render(<App />);
    expect(saved().corners[1]).toEqual({ x: 8, z: 0 });
    expect((screen.getByLabelText("Corner 2 x") as HTMLInputElement).value).toBe("8");
  });

  it("edge case, crossing walls: refused with both walls named, then fixed by moving the corner back", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "-2" } });
    expect(screen.getByRole("alert").textContent).toMatch(/Wall 2 crosses wall 4.*drawn in red/);
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "6" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saved().corners[1]).toEqual({ x: 6, z: 0 });
  });

  it("removing corners stops at a triangle, and adding one keeps the room valid", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Remove corner 4" }));
    expect(screen.getAllByRole("button", { name: /Remove corner/ }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Add corner" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saved().corners).toHaveLength(4);
  });

  it.each(Object.entries(PRESETS))("the %s preset is valid, and both cameras frame it", (_name, preset) => {
    const room = validateRoom(preset);
    expect(room.ok).toBe(true);
    if (!room.ok) return;
    const box = bounds(room.value);
    const plan = cameraPreset(room.value, "plan");
    expect(plan.position[1] * Math.tan((25 * Math.PI) / 180)).toBeGreaterThanOrEqual(Math.max(box.width, box.depth) / 2);
    expect(cameraPreset(room.value, "perspective").position[1]).toBeGreaterThan(room.value.height);
    expect(floorArea(room.value)).toBeGreaterThan(0);
    expect(walls(room.value)).toHaveLength(preset.corners.length);
  });
});
