import { describe, expect, it } from "vitest";

import { reorderBookmarkIds, useSortOrderStore } from "./useSortOrderStore";

describe("useSortOrderStore", () => {
  it("reorders visible bookmarks and preserves unseen saved ids", () => {
    expect(reorderBookmarkIds(undefined, ["a", "b", "c"], "c", "a")).toEqual([
      "c",
      "a",
      "b",
    ]);

    expect(
      reorderBookmarkIds(["b", "a", "old"], ["new", "a", "b"], "b", "new"),
    ).toEqual(["b", "new", "a", "old"]);
  });

  it("switches sortOrder to custom when reordering compact grid", () => {
    useSortOrderStore.setState({ sortOrder: "desc", customOrders: {} });
    useSortOrderStore
      .getState()
      .reorderCompactGrid("list:1", ["a", "b", "c"], "c", "a");

    expect(useSortOrderStore.getState().sortOrder).toBe("custom");
    expect(useSortOrderStore.getState().customOrders["list:1"]).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("defaults sortOrder to custom only when view has a saved custom order in compact grid", () => {
    useSortOrderStore.setState({
      sortOrder: "desc",
      customOrders: { "list:1": ["b", "a"] },
    });

    // View with saved order in compact grid -> defaults to custom
    useSortOrderStore.getState().syncViewDefaultSort("list:1", true);
    expect(useSortOrderStore.getState().sortOrder).toBe("custom");

    // Navigating to a view without a saved order -> resets to desc
    useSortOrderStore.getState().syncViewDefaultSort("list:2", true);
    expect(useSortOrderStore.getState().sortOrder).toBe("desc");

    // Non-compact-grid layout does not switch to custom
    useSortOrderStore.getState().syncViewDefaultSort("list:1", false);
    expect(useSortOrderStore.getState().sortOrder).toBe("desc");
  });
});
