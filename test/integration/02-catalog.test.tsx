// @vitest-environment jsdom
/**
 * The furniture scenario end to end through the real UI, joined to the room from stage 1: furnish a
 * room, turn a piece, shrink the room under it, reload — plus the edge cases this milestone lists.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../src/App";
import { footprint, footprintsOverlap, FURNITURE, insideRoom, type Item } from "../../src/domain/02-catalog";

const KEY = "room-configurator:scene";
const saved = () => JSON.parse(localStorage.getItem(KEY)!) as { room: { corners: { x: number; z: number }[] }; items: Item[] };
const add = (name: string) => fireEvent.click(screen.getByRole("button", { name: `Add ${name}` }));
const placed = () => within(document.querySelector(".placed") as HTMLElement).getAllByRole("listitem");

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("furniture catalogue — integration", () => {
  it("golden path: furnish the L-shape, nothing overlaps, everything is on the floor, and a reload keeps it", () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "L-shape" }));
    for (const name of ["Three-seat sofa", "Round coffee table", "Double bed", "Bookcase", "Armchair"]) add(name);
    expect(placed()).toHaveLength(5);

    const { room, items } = saved();
    const shapes = items.map((item) => footprint(FURNITURE.find((e) => e.id === item.catalogId)!, item.transform));
    shapes.forEach((shape) => expect(insideRoom(shape, room)).toBe(true));
    for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) expect(footprintsOverlap(shapes[i]!, shapes[j]!)).toBe(false);
    first.unmount();

    render(<App />);
    expect(placed()).toHaveLength(5);
  });

  it("edge case, a piece outside the room: shrinking the room flags it in red, keeps it, and growing back clears it", () => {
    render(<App />);
    add("Three-seat sofa");
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "2.6" } });
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "2.6" } });
    expect(screen.getByText(/1 piece is outside the room/)).toBeTruthy();
    expect(placed()[0]!.getAttribute("data-outside")).toBe("true");
    expect(saved().items).toHaveLength(1);

    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "5" } });
    expect(screen.queryByText(/outside the room/)).toBeNull();
  });

  it("edge case, a turn that would go through a wall is refused and explained", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Corner 3 z"), { target: { value: "1.2" } });
    fireEvent.change(screen.getByLabelText("Corner 4 z"), { target: { value: "1.2" } });
    add("Three-seat sofa");
    fireEvent.click(screen.getByRole("button", { name: "Turn Three-seat sofa" }));
    expect(screen.getByRole("alert").textContent).toMatch(/would push it through a wall/);
    expect(saved().items[0]!.transform.rotation).toBe(0);
  });

  it("edge case, a piece bigger than the room is refused", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("Corner 3 z"), { target: { value: "1.5" } });
    fireEvent.change(screen.getByLabelText("Corner 4 z"), { target: { value: "1.5" } });
    add("Double bed");
    expect(screen.getByRole("alert").textContent).toMatch(/Double bed is bigger than this room/);
    expect(saved().items).toHaveLength(0);
  });

  it("edge case, crossing walls from stage 1 still stop the room, and furniture stays in the last valid one", () => {
    render(<App />);
    add("Armchair");
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "-2" } });
    expect(screen.getByRole("alert").textContent).toMatch(/crosses/);
    expect(saved().room.corners[1]).toEqual({ x: 5, z: 0 });
    expect(saved().items).toHaveLength(1);
  });

  it("empty state, remove, and WebGL missing in jsdom: the lists still work without the 3D view", () => {
    render(<App />);
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
    add("Plant");
    fireEvent.click(screen.getByRole("button", { name: "Remove Plant" }));
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
    expect(screen.getByRole("note").textContent).toMatch(/can't show 3D/);
  });
});
