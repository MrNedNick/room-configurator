// @vitest-environment jsdom
/**
 * Undo and redo through the real UI: furniture and room edits step back and forward, quick successive
 * changes (a drag, held arrow keys) are one step, and the keyboard shortcut leaves text fields alone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";
import type { Item } from "../../src/domain/02-catalog";

const KEY = "room-configurator:scene";
const scene = () => JSON.parse(localStorage.getItem(KEY)!) as { items: Item[]; room: { corners: { x: number }[] } };
const key = (k: string, extra: KeyboardEventInit = {}) => fireEvent.keyDown(document.body, { key: k, ...extra });
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;

let now = 1_000_000;
/** Moves the clock on, so the next change is its own step rather than part of the last gesture. */
const later = () => vi.setSystemTime((now += 2000));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("undo and redo — integration", () => {
  it("steps furniture and room edits back and forward", () => {
    render(<App />);
    expect(button("Undo").disabled).toBe(true);

    later();
    fireEvent.click(button("Add Three-seat sofa"));
    const placed = scene().items[0]!.transform;
    later();
    key("ArrowLeft");
    later();
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "6" } });
    expect(scene().room.corners[1]!.x).toBe(6);

    fireEvent.click(button("Undo"));
    expect(scene().room.corners[1]!.x).toBe(5);
    expect((screen.getByLabelText("Corner 2 x") as HTMLInputElement).value).toBe("5");
    fireEvent.click(button("Undo"));
    expect(scene().items[0]!.transform).toEqual(placed);
    fireEvent.click(button("Undo"));
    expect(scene().items).toEqual([]);
    expect(button("Undo").disabled).toBe(true);

    fireEvent.click(button("Redo"));
    fireEvent.click(button("Redo"));
    expect(scene().items[0]!.transform.x).toBeCloseTo(placed.x - 0.1);
    expect(button("Redo").disabled).toBe(false);

    later();
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "6" } });
    expect(button("Redo").disabled).toBe(true);
  });

  it("quick successive moves undo as one step", () => {
    render(<App />);
    later();
    fireEvent.click(button("Add Three-seat sofa"));
    const placed = scene().items[0]!.transform;
    later();
    for (let i = 0; i < 5; i++) {
      key("ArrowLeft");
      vi.setSystemTime((now += 100));
    }
    fireEvent.click(button("Undo"));
    expect(scene().items[0]!.transform).toEqual(placed);
  });

  it("⌘/Ctrl+Z and ⇧⌘/Ctrl+Z work on the page but not inside a text field", () => {
    render(<App />);
    later();
    fireEvent.click(button("Add Three-seat sofa"));
    key("z", { ctrlKey: true });
    expect(scene().items).toEqual([]);
    key("z", { ctrlKey: true, shiftKey: true });
    expect(scene().items).toHaveLength(1);

    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "z", metaKey: true });
    expect(scene().items).toHaveLength(1);
  });
});
