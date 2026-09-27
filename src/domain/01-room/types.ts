/** Every length in the app is in metres; the scene JSON stores metres too. */
export type Metres = number;

/** A point on the floor plan: `x` to the right, `z` towards the viewer (Three.js axes, y is up). */
export interface Point {
  x: Metres;
  z: Metres;
}

/** The smallest and largest room the planner accepts, per side and in height. */
export const MIN_SIDE: Metres = 1;
export const MAX_SIDE: Metres = 50;
export const MIN_HEIGHT: Metres = 2;
export const MAX_HEIGHT: Metres = 6;

/**
 * A room: its floor outline as corners in order (either direction), and the ceiling height.
 * Walls run between consecutive corners and from the last back to the first.
 */
export interface Room {
  name: string;
  corners: Point[];
  height: Metres;
}

export interface Wall {
  index: number;
  from: Point;
  to: Point;
  length: Metres;
}

export interface Bounds {
  min: Point;
  max: Point;
  width: Metres;
  depth: Metres;
  centre: Point;
}

export type CameraView = "plan" | "perspective";

/** Where the camera sits and looks, and how far orbiting may take it. */
export interface CameraPreset {
  view: CameraView;
  position: [number, number, number];
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  /** Plan view looks straight down; perspective keeps the camera above the floor. */
  maxPolarAngle: number;
}
