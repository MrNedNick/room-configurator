// @vitest-environment jsdom
/**
 * Saving, exporting and opening rooms through the real UI — with no WebGL, as everywhere in these tests,
 * because files never depend on the 3D view.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { sceneJson } from "../../src/adapters/scene-store";
import { crossingWallsFile, furnished } from "../fixtures/06-export/scenes";

const KEY = "room-configurator:scene";
const downloads: { name: string; blob: Blob }[] = [];

beforeEach(() => {
  localStorage.clear();
  downloads.length = 0;
  const blobs = new Map<string, Blob>();
  let n = 0;
  vi.stubGlobal("URL", { ...URL, createObjectURL: (blob: Blob) => { const url = `blob:${++n}`; blobs.set(url, blob); return url; }, revokeObjectURL: () => {} });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: blobs.get(this.href.replace(/^.*?(blob:)/, "blob:"))! });
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const openFile = (text: string, name = "room.json") =>
  fireEvent.change(screen.getByLabelText("Open a room file"), { target: { files: [new File([text], name, { type: "application/json" })] } });

describe("save, export and open — integration", () => {
  it("the floor plan and the room file are downloaded, named after the room", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add Three-seat sofa" }));
    fireEvent.click(screen.getByRole("button", { name: "Floor plan (SVG)" }));
    fireEvent.click(screen.getByRole("button", { name: "Room file (JSON)" }));
    expect(downloads.map((d) => d.name)).toEqual(["living-room-plan.svg", "living-room-scene.json"]);
    const svg = await downloads[0]!.blob.text();
    expect(svg).toContain(">Three-seat sofa<");
    expect(svg).toContain(">5.00 m<");
    const json = JSON.parse(await downloads[1]!.blob.text());
    expect(json).toMatchObject({ version: 3, room: { name: "Living room" }, items: [{ catalogId: "sofa-3" }] });
  });

  it("a room file opens straight away over an empty room, and survives a reload", async () => {
    render(<App />);
    openFile(sceneJson(furnished));
    await waitFor(() => expect(screen.getByText("Opened Kids & guests <room>.")).toBeTruthy());
    expect(screen.getAllByRole("button", { name: "Double bed" }).length).toBeGreaterThan(0);
    cleanup();
    render(<App />);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ room: { name: "Kids & guests <room>" }, finish: { floor: "walnut-floor" }, items: [{ materialId: "tan-leather" }, {}] });
  });

  it("over a furnished room it asks first — keeping the current room changes nothing", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add Armchair" }));
    openFile(sceneJson(furnished));
    const dialog = await screen.findByRole("alertdialog", { name: "Replace the current room?" });
    expect(dialog.textContent).toMatch(/Kids & guests <room> \(2 pieces\) from room\.json/);
    fireEvent.click(screen.getByRole("button", { name: "Keep the current room" }));
    expect(JSON.parse(localStorage.getItem(KEY)!).items.map((i: { catalogId: string }) => i.catalogId)).toEqual(["armchair"]);
    openFile(sceneJson(furnished));
    fireEvent.click(await screen.findByRole("button", { name: "Replace" }));
    expect(JSON.parse(localStorage.getItem(KEY)!).items).toHaveLength(2);
  });

  it("edge case, a file whose walls cross is refused with the walls named, and the room is untouched", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Add Armchair" }));
    openFile(crossingWallsFile);
    expect((await screen.findByText(/walls that cross \(wall 1 and wall 3\)/)).getAttribute("role")).toBe("alert");
    expect(JSON.parse(localStorage.getItem(KEY)!).items).toHaveLength(1);
  });

  it("a file that isn't a room says so", async () => {
    render(<App />);
    openFile("<html>not a room</html>", "page.html");
    expect(await screen.findByText(/isn't a saved room/)).toBeTruthy();
    openFile(JSON.stringify({ ...furnished, version: 7 }));
    expect(await screen.findByText(/saved by a newer version/)).toBeTruthy();
  });
});
