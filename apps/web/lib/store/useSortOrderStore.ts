import { create } from "zustand";

import { ZSortOrder } from "@karakeep/shared/types/bookmarks";

export type ClientSortOrder = ZSortOrder | "custom";

const STORAGE_KEY = "karakeep-compact-grid-order";
const LIST_ORDER_STORAGE_KEY = "karakeep-list-order";

function loadOrders(key: string): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

function saveOrders(key: string, orders: Record<string, string[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(orders));
  } catch {
    // Ignore storage quota errors
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
  customListOrders: Record<string, string[]>;
  setSortOrder: (sortOrder: ClientSortOrder) => void;
  syncViewDefaultSort: (viewKey: string, isCompactGrid: boolean) => void;
  reorderCompactGrid: (
    viewKey: string,
    visibleIds: string[],
    fromId: string,
    toId: string,
  ) => void;
  reorderLists: (
    groupKey: string,
    visibleIds: string[],
    fromId: string,
    toId: string,
  ) => void;
}

export const useSortOrderStore = create<SortOrderState>((set) => ({
  sortOrder: "desc", // default sort order
  customOrders: loadOrders(STORAGE_KEY),
  customListOrders: loadOrders(LIST_ORDER_STORAGE_KEY),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  syncViewDefaultSort: (viewKey, isCompactGrid) =>
    set((state) => {
      const customOrders = Object.keys(state.customOrders).length
        ? state.customOrders
        : loadOrders(STORAGE_KEY);
      const hasCustomOrder = Boolean(customOrders[viewKey]?.length);
      if (isCompactGrid) {
        if (hasCustomOrder) {
          return { customOrders, sortOrder: "custom" };
        }
        if (state.sortOrder === "custom") {
          return { customOrders, sortOrder: "desc" };
        }
      }
      return { customOrders };
    }),
  reorderCompactGrid: (viewKey, visibleIds, fromId, toId) =>
    set((state) => {
      const current = Object.keys(state.customOrders).length
        ? state.customOrders
        : loadOrders(STORAGE_KEY);
      const nextIds = reorderBookmarkIds(
        current[viewKey],
        visibleIds,
        fromId,
        toId,
      );
      const customOrders = { ...current, [viewKey]: nextIds };
      saveOrders(STORAGE_KEY, customOrders);
      return { customOrders, sortOrder: "custom" };
    }),
  reorderLists: (groupKey, visibleIds, fromId, toId) =>
    set((state) => {
      const current = Object.keys(state.customListOrders).length
        ? state.customListOrders
        : loadOrders(LIST_ORDER_STORAGE_KEY);
      const nextIds = reorderBookmarkIds(
        current[groupKey],
        visibleIds,
        fromId,
        toId,
      );
      const customListOrders = { ...current, [groupKey]: nextIds };
      saveOrders(LIST_ORDER_STORAGE_KEY, customListOrders);
      return { customListOrders };
    }),
}));
