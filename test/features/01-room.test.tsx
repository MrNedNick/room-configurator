// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App";

const KEY = "room-configurator:scene";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const saved = () => JSON.parse(localStorage.getItem(KEY)!).room;

describe("room editing", () => {
  it("jsdom has no WebGL: the view says so and the editor keeps working", () => {
    render(<App />);
    expect(screen.getByRole("note").textContent).toMatch(/can't show 3D/);
    fireEvent.click(screen.getByRole("button", { name: "L-shape" }));
    expect(saved().corners).toHaveLength(6);
    expect(screen.getByRole("status").textContent).toMatch(/30 m² floor · 6 walls/);
  });

  it("crossing walls: explained, and the last valid room stays saved", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Corner 2 x"), { target: { value: "-2" } });
    expect(screen.getByRole("alert").textContent).toMatch(/Wall 2 crosses wall 4/);
    expect(saved().corners[1]).toEqual({ x: 5, z: 0 });
  });

  it("a half-typed number is refused without losing the room, and a reload restores it", () => {
    const first = render(<App />);
    fireEvent.change(screen.getByLabelText("Corner 3 x"), { target: { value: "6.5" } });
    fireEvent.change(screen.getByLabelText("Corner 3 z"), { target: { value: "" } });
    expect(screen.getByRole("alert").textContent).toMatch(/needs? a number/);
    first.unmount();

    render(<App />);
    expect((screen.getByLabelText("Corner 3 x") as HTMLInputElement).value).toBe("6.5");
    expect((screen.getByLabelText("Corner 3 z") as HTMLInputElement).value).toBe("4");
  });

  it("unreadable saved data is not overwritten until the user starts over", () => {
    localStorage.setItem(KEY, "{broken");
    render(<App />);
    expect(screen.getByRole("alert").textContent).toMatch(/couldn't be read/);
    fireEvent.click(screen.getByRole("button", { name: "L-shape" }));
    expect(localStorage.getItem(KEY)).toBe("{broken");

    fireEvent.click(screen.getByRole("button", { name: /start a new room/ }));
    expect(saved().name).toBe("Living room");
    expect(Object.keys(localStorage).some((key) => key.startsWith(`${KEY}:unreadable-`))).toBe(true);
  });
});
