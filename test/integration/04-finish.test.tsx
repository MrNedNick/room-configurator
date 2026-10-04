// @vitest-environment jsdom
/**
 * Finishes and light end to end through the real UI. jsdom has no WebGL, so this is also the "lost
 * WebGL" path: the choices still work, are saved and come back after a reload; only the drawing waits.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../src/App";
import { crowded } from "../fixtures/04-finish/scenes";

const KEY = "room-configurator:scene";
const saved = () => JSON.parse(localStorage.getItem(KEY)!);
const radio = (group: string, name: string) => within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", { name });
const reload = () => {
  cleanup();
  render(<App />);
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("finish and light — integration", () => {
  it("floor, walls, a piece's finish and the light are chosen, saved and back after a reload", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add Three-seat sofa" }));
    fireEvent.click(radio("Floor", "Walnut boards"));
    fireEvent.click(radio("Walls", "Sage green"));
    fireEvent.click(radio("Three-seat sofa finish", "Tan leather"));
    fireEvent.click(radio("Time of day", "Evening"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Lamps in the room are on" }));

    expect(saved()).toMatchObject({ version: 3, finish: { floor: "walnut-floor", walls: "sage" }, lighting: { time: "evening", lampsOn: false } });
    expect(saved().items[0].materialId).toBe("tan-leather");

    reload();
    expect(radio("Floor", "Walnut boards").getAttribute("aria-checked")).toBe("true");
    expect(radio("Walls", "Sage green").getAttribute("aria-checked")).toBe("true");
    expect(radio("Time of day", "Evening").getAttribute("aria-checked")).toBe("true");
    expect((screen.getByRole("checkbox", { name: "Lamps in the room are on" }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Three-seat sofa" }));
    expect(radio("Three-seat sofa finish", "Tan leather").getAttribute("aria-checked")).toBe("true");
  });

  it("a piece goes back to its catalogue colour, and with nothing selected the panel says what to do", () => {
    render(<App />);
    expect(screen.getByText("Select a piece to change its finish.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add Armchair" }));
    fireEvent.click(radio("Armchair finish", "Linen"));
    fireEvent.click(radio("Armchair finish", "As in the catalogue"));
    expect("materialId" in saved().items[0]).toBe(false);
  });

  it("a room saved before finishes existed opens with the default floor, walls and daylight", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, room: { name: "Old", height: 2.7, corners: [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }, { x: 0, z: 3 }] }, items: [] }));
    render(<App />);
    expect(radio("Floor", "Oak boards").getAttribute("aria-checked")).toBe("true");
    expect(radio("Time of day", "Day").getAttribute("aria-checked")).toBe("true");
    expect(saved().version).toBe(3);
  });

  it("edge case, a heavy room: extra lamps only glow and shadows are off — and the page says so", () => {
    const hall = { name: "Hall", height: 4, corners: [{ x: 0, z: 0 }, { x: 16, z: 0 }, { x: 16, z: 9 }, { x: 0, z: 9 }] };
    localStorage.setItem(KEY, JSON.stringify({ version: 3, room: hall, items: crowded, finish: { floor: "concrete", walls: "warm-white" }, lighting: { time: "night", lampsOn: true } }));
    render(<App />);
    expect(screen.getByText(/4 more lamps glow without lighting the room/)).toBeTruthy();
    expect(screen.getByText(/Shadows are off with more than 40 pieces/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Lamps in the room are on" }));
    expect(screen.queryByText(/more lamps glow/)).toBeNull();
  });
});
