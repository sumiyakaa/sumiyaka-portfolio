import type { ExploreSerializableState, ViewMode } from "@/types/filter";
import { sanitizeExploreState } from "./works";

const STORAGE_KEY = "akashiki-works-explore";
const VIEW_MODE_KEY = "akashiki-works-view";

export function readStoredExploreState(): ExploreSerializableState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeExploreState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredExploreState(
  state: ExploreSerializableState
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or disabled
  }
}

export function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "grid" || stored === "list" || stored === "thumbnail")
      return stored;
  } catch {
    // ignore
  }
  return "grid";
}

export function writeStoredViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
