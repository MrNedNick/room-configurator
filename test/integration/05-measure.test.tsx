// @vitest-environment jsdom
/**
 * Dimensions and collisions through the real UI. jsdom has no WebGL, so this is the path that must
 * work without the 3D view: the clearances and warnings are written out in the furniture panel.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import type { Item } from "../../src/domain/02-catalog";

const KEY = "room-configurator:scene";
const living = { name: "Living room", height: 2.7, corners: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }] };
const piece = (id: string, catalogId: string, name: string, x: number, z: number): Item => ({ id, catalogId, name, transform: { x, z, rotation: 0 } });
const scene = (items: Item[]) =>
  localStorage.setItem(KEY, JSON.stringify({ version: 3, room: living, items, finish: { floor: "oak-floor", walls: "warm-white" }, lighting: { time: "day", lampsOn: true } }));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("dimensions and collisions — integration", () => {
  it("the selected piece shows how much floor is free to each wall", () => {
    scene([piece("sofa", "sofa-3", "Three-seat sofa", 1.55, 0.45)]);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Three-seat sofa" }));
    expect(screen.getByLabelText("Free floor around Three-seat sofa").textContent).toBe("To the walls: left 50 cm · right 2.40 m · back 0 cm · front 3.10 m");
  });

  it("pieces standing in each other are named, and each name selects its piece", () => {
    scene([piece("sofa", "sofa-3", "Three-seat sofa", 1.55, 0.45), piece("chair", "armchair", "Armchair", 2.9, 0.6)]);
    render(<App />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/Two pieces stand in each other:\s*Three-seat sofa and Armchair/);
    fireEvent.click(screen.getAllByRole("button", { name: "Armchair" }).find((button) => alert.contains(button))!);
    expect(screen.getByLabelText("Free floor around Armchair")).toBeTruthy();
  });

  it("moving a piece out of the other clears the warning; a gap under 60 cm is pointed out", () => {
    scene([piece("sofa", "sofa-3", "Three-seat sofa", 1.55, 0.45), piece("chair", "armchair", "Armchair", 2.9, 0.6)]);
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "Armchair" })[0]!);
    for (let i = 0; i < 5; i++) fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.queryByText(/stand in each other/)).toBeNull();
    // The armchair's left edge is now at 3.4 − 0.425 = 2.975 m, the sofa ends at 2.6 m.
    expect(screen.getByText(/Narrow to walk between/).parentElement!.textContent).toMatch(/Three-seat sofa and Armchair — 38 cm/);
  });

  it("dimensions can be switched off in the view, and the choice is remembered", () => {
    render(<App />);
    const toggle = screen.getByRole("button", { name: "Dimensions" });
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    cleanup();
    render(<App />);
    expect(screen.getByRole("button", { name: "Dimensions" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("edge case, a piece left outside the room after a wall moves still gets measured without breaking the page", () => {
    scene([piece("sofa", "sofa-3", "Three-seat sofa", 4, 2)]);
    render(<App />);
    fireEvent.change(screen.getAllByRole("spinbutton")[2]!, { target: { value: "3" } }); // corner 2, x: the right wall moves to 3 m
    fireEvent.click(screen.getByRole("button", { name: "Three-seat sofa" }));
    expect(screen.getByText(/outside the room after the last change/)).toBeTruthy();
    expect(screen.getByLabelText("Free floor around Three-seat sofa")).toBeTruthy();
  });
});
