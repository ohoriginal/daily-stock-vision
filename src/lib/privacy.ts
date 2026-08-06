import { useSyncExternalStore } from "react";

const KEY = "stok.hideValues";

let masked = false;
const listeners = new Set<() => void>();

export function initMask() {
  try {
    masked = window.localStorage.getItem(KEY) === "1";
  } catch {
    masked = false;
  }
  listeners.forEach((l) => l());
}

export function isMasked() {
  return masked;
}

export function setMask(next: boolean) {
  masked = next;
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function toggleMask() {
  setMask(!masked);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useMask() {
  return useSyncExternalStore(subscribe, isMasked, () => false);
}
