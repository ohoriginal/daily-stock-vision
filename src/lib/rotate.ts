import { useSyncExternalStore } from "react";

const KEY = "stok.rotation";

export type Rotation = 0 | 90 | 180 | 270;

let rotation: Rotation = 0;
const listeners = new Set<() => void>();

function parse(value: string | null): Rotation {
  const n = Number(value);
  return n === 90 || n === 180 || n === 270 ? (n as Rotation) : 0;
}

export function initRotation() {
  try {
    rotation = parse(window.localStorage.getItem(KEY));
  } catch {
    rotation = 0;
  }
  listeners.forEach((l) => l());
}

export function getRotation() {
  return rotation;
}

export function setRotation(next: Rotation) {
  rotation = next;
  try {
    window.localStorage.setItem(KEY, String(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/** Gira 90° no sentido horário. */
export function rotateScreen() {
  setRotation(((rotation + 90) % 360) as Rotation);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useRotation() {
  return useSyncExternalStore(subscribe, getRotation, () => 0 as Rotation);
}
