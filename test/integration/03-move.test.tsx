// @vitest-environment jsdom
/**
 * Moving furniture end to end through the real UI. jsdom has no WebGL — exactly the "потеря WebGL" case
 * of this milestone — so everything here goes through the paths that must work without the 3D view:
 * arrow keys and the typed position. Dragging in the view is covered by the domain tests of
 * `snapPosition`/`moveItem`, which the view calls on every pointer move.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import type { Item } from "../../src/domain/02-catalog";

const KEY = "room-configurator:scene";
const sofa = () => (JSON.parse(localStorage.getItem(KEY)!).items as Item[])[0]!.transform;
const key = (k: string, extra: KeyboardEventInit = {}) => fireEvent.keyDown(document.body, { key: k, ...extra });

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function furnish() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Add Three-seat sofa" }));
  return sofa();
}

describe("moving furniture — integration", () => {
  it("without WebGL the view says so, and arrow keys still move the selected piece (Shift for 1 cm)", () => {
    const start = furnish();
    expect(screen.getByRole("note").textContent).toMatch(/can't show 3D/);
    key("ArrowLeft");
    key("ArrowDown", { shiftKey: true });
    expect(sofa()).toMatchObject({ x: start.x - 0.1, z: start.z + 0.01 });
  });

  it("edge case, a piece pushed out of the room by the keyboard stays where it was and says why", () => {
    furnish();
    for (let i = 0; i < 30; i++) key("ArrowRight");
    const { x } = sofa();
    expect(x + 2.1 / 2).toBeLessThanOrEqual(5 + 1e-9);
    expect(screen.getByRole("alert").textContent).toMatch(/through a wall — it stays where it was/);
  });

  it("a typed position is used exactly, and a reload keeps it", () => {
    furnish();
    const x = screen.getByLabelText("x, m") as HTMLInputElement;
    fireEvent.change(x, { target: { value: "1.23" } });
    fireEvent.blur(x);
    expect(sofa().x).toBe(1.23);
    cleanup();
    render(<App />);
    expect(sofa().x).toBe(1.23);
  });

  it("R turns, Delete removes, Escape lets go — and typing in a field is left alone", () => {
    furnish();
    key("r");
    expect(sofa().rotation).toBe(90);
    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "ArrowLeft" });
    expect(sofa().rotation).toBe(90);
    key("Escape");
    expect(screen.getByText("Select a piece to move it.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Three-seat sofa" }));
    key("Delete");
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
  });

  it("the snapping preference is remembered", () => {
    furnish();
    const toggle = screen.getByRole("checkbox", { name: /Snap to a 10 cm grid/ }) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    cleanup();
    render(<App />);
    expect((screen.getByRole("checkbox", { name: /Snap to a 10 cm grid/ }) as HTMLInputElement).checked).toBe(false);
  });

  it("earlier stages still hold: moving the wall in flags the moved piece as outside", () => {
    furnish();
    for (let i = 0; i < 10; i++) key("ArrowRight");
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "4" } });
    expect(screen.getByText(/1 piece is outside the room/)).toBeTruthy();
  });
});
