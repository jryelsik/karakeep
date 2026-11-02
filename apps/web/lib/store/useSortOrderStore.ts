import { create } from "zustand";

import { ZSortOrder } from "@karakeep/shared/types/bookmarks";

export type ClientSortOrder = ZSortOrder | "custom";

// ponytail: persists custom compact-grid orders in browser localStorage per view; upgrade to a DB column if cross-device sync is needed
const STORAGE_KEY = "karakeep-compact-grid-order";

function loadCustomOrders(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function reorderBookmarkIds(
  currentOrder: string[] | undefined,
  visibleIds: string[],
  fromId: string,
  toId: string,
): string[] {
  const base = currentOrder?.length
    ? [
        ...visibleIds.filter((id) => !currentOrder.includes(id)),
        ...currentOrder.filter((id) => visibleIds.includes(id)),
        ...currentOrder.filter((id) => !visibleIds.includes(id)),
      ]
    : [...visibleIds];
  const fromIdx = base.indexOf(fromId);
  const toIdx = base.indexOf(toId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return base;
  base.splice(fromIdx, 1);
  base.splice(toIdx, 0, fromId);
  return base;
}

interface SortOrderState {
  sortOrder: ClientSortOrder;
  customOrders: Record<string, string[]>;
  setSortOrder: (sortOrder: ClientSortOrder) => void;
  reorderCompactGrid: (
    viewKey: string,
    visibleIds: string[],
    fromId: string,
    toId: string,
  ) => void;
}

export const useSortOrderStore = create<SortOrderState>((set) => ({
  sortOrder: "desc", // default sort order
  customOrders: loadCustomOrders(),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  reorderCompactGrid: (viewKey, visibleIds, fromId, toId) =>
    set((state) => {
      const current = Object.keys(state.customOrders).length
        ? state.customOrders
        : loadCustomOrders();
      const nextIds = reorderBookmarkIds(
        current[viewKey],
        visibleIds,
        fromId,
        toId,
      );
      const customOrders = { ...current, [viewKey]: nextIds };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customOrders));
      } catch {
        // Ignore storage quota errors
      }
      return { customOrders, sortOrder: "custom" };
    }),
}));
