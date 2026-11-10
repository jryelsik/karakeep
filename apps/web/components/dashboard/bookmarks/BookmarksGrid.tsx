import { memo, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import KeyboardShortcutsDialog from "@/components/dashboard/KeyboardShortcutsDialog";
import NoBookmarksBanner from "@/components/dashboard/bookmarks/NoBookmarksBanner";
import { ActionButton } from "@/components/ui/action-button";
import ActionConfirmingDialog from "@/components/ui/action-confirming-dialog";
import { BOOKMARK_DRAG_MIME } from "@/lib/bookmark-drag";
import useBulkActionsStore from "@/lib/bulkActions";
import { useBookmarkKeyboardNavigation } from "@/lib/hooks/useBookmarkKeyboardNavigation";
import { useTranslation } from "@/lib/i18n/client";
import { useInBookmarkGridStore } from "@/lib/store/useInBookmarkGridStore";
import { useKeyboardNavigationStore } from "@/lib/store/useKeyboardNavigationStore";
import { useSortOrderStore } from "@/lib/store/useSortOrderStore";
import {
  bookmarkLayoutSwitch,
  COMPACT_GRID_SIZE_METRICS,
  useBookmarkLayout,
  useCompactGridColumns,
  useCompactGridIconSize,
  useGridColumns,
} from "@/lib/userLocalSettings/bookmarksLayout";
import { cn } from "@/lib/utils";
import tailwindConfig from "@/tailwind.config";
import { Slot } from "@radix-ui/react-slot";
import { ErrorBoundary } from "react-error-boundary";
import { useInView } from "react-intersection-observer";
import Masonry from "react-masonry-css";
import resolveConfig from "tailwindcss/resolveConfig";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useBookmarkListContext } from "@karakeep/shared-react/hooks/bookmark-list-context";

import BookmarkCard from "./BookmarkCard";
import EditorCard from "./EditorCard";
import UnknownCard from "./UnknownCard";

function StyledBookmarkCard({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Slot
      className={cn(
        "mb-4 border border-border bg-card hover:shadow-lg hover:transition-shadow",
        className,
      )}
      {...props}
    >
      {children}
    </Slot>
  );
}

const BookmarkGridItem = memo(function BookmarkGridItem({
  bookmark,
  index,
  borderless = false,
}: {
  bookmark: ZBookmark;
  index: number;
  borderless?: boolean;
}) {
  const isFocused = useKeyboardNavigationStore(
    (state) => state.isNavigating && state.focusedIndex === index,
  );

  if (borderless) {
    return (
      <ErrorBoundary fallback={<UnknownCard bookmark={bookmark} />}>
        <BookmarkCard
          bookmark={bookmark}
          bookmarkIndex={index}
          className={cn(
            isFocused &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={<UnknownCard bookmark={bookmark} />}>
      <StyledBookmarkCard
        className={cn(
          isFocused &&
            "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <BookmarkCard bookmark={bookmark} bookmarkIndex={index} />
      </StyledBookmarkCard>
    </ErrorBoundary>
  );
});

function getBreakpointConfig(userColumns: number) {
  const fullConfig = resolveConfig(tailwindConfig);

  const breakpointColumnsObj: { [key: number]: number; default: number } = {
    default: userColumns,
  };

  // Responsive behavior: reduce columns on smaller screens
  const lgColumns = Math.max(1, Math.min(userColumns, userColumns - 1));
  const mdColumns = Math.max(1, Math.min(userColumns, 2));
  const smColumns = 1;

  breakpointColumnsObj[parseInt(fullConfig.theme.screens.lg)] = lgColumns;
  breakpointColumnsObj[parseInt(fullConfig.theme.screens.md)] = mdColumns;
  breakpointColumnsObj[parseInt(fullConfig.theme.screens.sm)] = smColumns;
  return breakpointColumnsObj;
}

function getColumnsForViewport(userColumns: number, viewportWidth: number) {
  const fullConfig = resolveConfig(tailwindConfig);
  const screens = fullConfig.theme.screens;
  const lg = parseInt(screens.lg);
  const md = parseInt(screens.md);
  const sm = parseInt(screens.sm);

  if (viewportWidth <= sm) {
    return 1;
  }
  if (viewportWidth <= md) {
    return Math.max(1, Math.min(userColumns, 2));
  }
  if (viewportWidth <= lg) {
    return Math.max(1, userColumns - 1);
  }
  return userColumns;
}

function useActiveGridColumns(userColumns: number) {
  const [activeColumns, setActiveColumns] = useState(userColumns);

  useEffect(() => {
    let animationFrame: number | null = null;
    const updateActiveColumns = () => {
      if (animationFrame !== null) {
        return;
      }
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        setActiveColumns(getColumnsForViewport(userColumns, window.innerWidth));
      });
    };

    const updateActiveColumnsImmediately = () => {
      setActiveColumns(getColumnsForViewport(userColumns, window.innerWidth));
    };

    updateActiveColumnsImmediately();
    window.addEventListener("resize", updateActiveColumns);
    return () => {
      window.removeEventListener("resize", updateActiveColumns);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [userColumns]);

  return activeColumns;
}

export default function BookmarksGrid({
  bookmarks,
  hasNextPage = false,
  fetchNextPage = () => ({}),
  isFetchingNextPage = false,
  showEditorCard = false,
  isSearch = false,
}: {
  bookmarks: ZBookmark[];
  showEditorCard?: boolean;
  isSearch?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const layout = useBookmarkLayout();
  const isCompactGrid = layout === "compact-grid";
  const sortOrder = useSortOrderStore((state) => state.sortOrder);
  const customOrders = useSortOrderStore((state) => state.customOrders);
  const syncViewDefaultSort = useSortOrderStore(
    (state) => state.syncViewDefaultSort,
  );
  const reorderCompactGrid = useSortOrderStore(
    (state) => state.reorderCompactGrid,
  );
  const isBulkEditEnabled = useBulkActionsStore(
    (state) => state.isBulkEditEnabled,
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const gridColumns = useGridColumns();
  const compactGridColumns = useCompactGridColumns();
  const compactGridIconSize = useCompactGridIconSize();
  const compactMetrics = COMPACT_GRID_SIZE_METRICS[compactGridIconSize];
  const activeGridColumns = useActiveGridColumns(gridColumns);
  const compactGridRef = useRef<HTMLDivElement>(null);
  const [activeCompactColumns, setActiveCompactColumns] = useState(
    compactGridColumns || 6,
  );
  const setVisibleBookmarks = useBulkActionsStore(
    (state) => state.setVisibleBookmarks,
  );
  const setListContext = useBulkActionsStore((state) => state.setListContext);
  const setInBookmarkGrid = useInBookmarkGridStore(
    (state) => state.setInBookmarkGrid,
  );
  const withinListContext = useBookmarkListContext();
  const breakpointConfig = useMemo(
    () => getBreakpointConfig(gridColumns),
    [gridColumns],
  );
  const { ref: loadMoreRef, inView: loadMoreButtonInView } = useInView();

  const viewKey = withinListContext?.id
    ? `list:${withinListContext.id}`
    : pathname || "default";

  useEffect(() => {
    syncViewDefaultSort(viewKey, isCompactGrid);
  }, [viewKey, isCompactGrid, syncViewDefaultSort]);

  // ponytail: sorts loaded pages client-side in compact-grid; upgrade to server-side ordering if cross-page manual sorting is needed
  const orderedBookmarks = useMemo(() => {
    if (!isCompactGrid || sortOrder !== "custom") return bookmarks;
    const savedOrder = customOrders[viewKey];
    if (!savedOrder?.length) return bookmarks;
    const pos = new Map(savedOrder.map((id, i) => [id, i]));
    return [...bookmarks].sort((a, b) => {
      const ia = pos.get(a.id) ?? -1;
      const ib = pos.get(b.id) ?? -1;
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return -1;
      if (ib === -1) return 1;
      return ia - ib;
    });
  }, [bookmarks, customOrders, isCompactGrid, sortOrder, viewKey]);

  useEffect(() => {
    if (layout !== "compact-grid") return;
    const el = compactGridRef.current;
    if (!el) return;
    const { tileWidth, gap } = compactMetrics;
    const updateCols = () => {
      const width = el.clientWidth;
      const fitCols = Math.max(
        1,
        Math.floor((width + gap) / (tileWidth + gap)),
      );
      setActiveCompactColumns(
        compactGridColumns === 0
          ? fitCols
          : Math.min(compactGridColumns, fitCols),
      );
    };
    updateCols();
    const ro = new ResizeObserver(updateCols);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout, compactGridColumns, compactMetrics, orderedBookmarks.length]);

  // For list/compact layouts, navigation is single-column
  const isListLayout = layout === "list" || layout === "compact";
  const navColumns = isListLayout
    ? 1
    : layout === "compact-grid"
      ? activeCompactColumns
      : activeGridColumns;

  const {
    helpDialogOpen,
    setHelpDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    isBulkDelete,
    deleteCount,
    confirmDelete,
    isDeletePending,
  } = useBookmarkKeyboardNavigation({
    bookmarks: orderedBookmarks,
    columns: navColumns,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  useEffect(() => {
    setVisibleBookmarks(orderedBookmarks);
    setListContext(withinListContext);

    return () => {
      setVisibleBookmarks([]);
      setListContext(undefined);
    };
  }, [
    orderedBookmarks,
    setListContext,
    setVisibleBookmarks,
    withinListContext,
  ]);

  useEffect(() => {
    setInBookmarkGrid(true);
    return () => {
      setInBookmarkGrid(false);
    };
  }, [setInBookmarkGrid]);

  useEffect(() => {
    if (loadMoreButtonInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, loadMoreButtonInView]);

  if (orderedBookmarks.length == 0 && !showEditorCard) {
    return (
      <>
        <NoBookmarksBanner isSearch={isSearch} />
        <KeyboardShortcutsDialog
          open={helpDialogOpen}
          setOpen={setHelpDialogOpen}
        />
      </>
    );
  }

  const children = [
    showEditorCard && !isCompactGrid && (
      <EditorCard
        key={"editor"}
        className="mb-4 border border-border bg-card hover:shadow-lg hover:transition-shadow"
      />
    ),
    ...orderedBookmarks.map((bookmark, index) => (
      <BookmarkGridItem
        key={bookmark.id}
        bookmark={bookmark}
        index={index}
        borderless={isCompactGrid}
      />
    )),
  ];
  return (
    <>
      {bookmarkLayoutSwitch(layout, {
        masonry: (
          <Masonry
            className="-ml-4 flex w-auto"
            columnClassName="pl-4"
            breakpointCols={breakpointConfig}
          >
            {children}
          </Masonry>
        ),
        grid: (
          <Masonry
            className="-ml-4 flex w-auto"
            columnClassName="pl-4"
            breakpointCols={breakpointConfig}
          >
            {children}
          </Masonry>
        ),
        list: <div className="grid grid-cols-1">{children}</div>,
        compact: <div className="grid grid-cols-1">{children}</div>,
        "compact-grid": (
          <div className="flex flex-col">
            {showEditorCard && (
              <EditorCard
                key={"editor"}
                className="mb-4 border border-border bg-card hover:shadow-lg hover:transition-shadow"
              />
            )}
            <div ref={compactGridRef} className="w-full py-4">
              <div
                className="mx-auto grid justify-center"
                style={{
                  gap: `${compactMetrics.gap}px`,
                  gridTemplateColumns: `repeat(auto-fill, ${compactMetrics.tileWidth}px)`,
                  maxWidth:
                    compactGridColumns > 0
                      ? `${compactGridColumns * compactMetrics.tileWidth + (compactGridColumns - 1) * compactMetrics.gap}px`
                      : undefined,
                }}
              >
                {orderedBookmarks.map((bookmark, index) => (
                  <div
                    key={bookmark.id}
                    draggable={!isBulkEditEnabled}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData(BOOKMARK_DRAG_MIME, bookmark.id);
                      e.dataTransfer.effectAllowed = "copyMove";
                      setDraggedId(bookmark.id);
                    }}
                    onDragOver={(e) => {
                      if (!draggedId || draggedId === bookmark.id) return;
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverId !== bookmark.id) {
                        setDragOverId(bookmark.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverId === bookmark.id) {
                        setDragOverId(null);
                      }
                    }}
                    onDrop={(e) => {
                      const fromId =
                        draggedId || e.dataTransfer.getData(BOOKMARK_DRAG_MIME);
                      setDraggedId(null);
                      setDragOverId(null);
                      if (!fromId || fromId === bookmark.id) return;
                      e.preventDefault();
                      e.stopPropagation();
                      reorderCompactGrid(
                        viewKey,
                        orderedBookmarks.map((b) => b.id),
                        fromId,
                        bookmark.id,
                      );
                    }}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    className={cn(
                      "rounded-xl transition-opacity",
                      !isBulkEditEnabled &&
                        "cursor-grab active:cursor-grabbing",
                      draggedId === bookmark.id && "opacity-40",
                      dragOverId === bookmark.id &&
                        draggedId !== bookmark.id &&
                        "ring-2 ring-primary",
                    )}
                  >
                    <BookmarkGridItem
                      bookmark={bookmark}
                      index={index}
                      borderless
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ),
      })}
      {hasNextPage && (
        <div className="flex justify-center">
          <ActionButton
            ref={loadMoreRef}
            ignoreDemoMode={true}
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            variant="ghost"
          >
            {t("actions.load_more")}
          </ActionButton>
        </div>
      )}

      <KeyboardShortcutsDialog
        open={helpDialogOpen}
        setOpen={setHelpDialogOpen}
      />

      <ActionConfirmingDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={t("dialogs.bookmarks.delete_confirmation_title")}
        description={
          isBulkDelete
            ? t("dialogs.bookmarks.bulk_delete_confirmation_description", {
                count: deleteCount,
              })
            : t("dialogs.bookmarks.delete_confirmation_description")
        }
        actionButton={() => (
          <ActionButton
            type="button"
            variant="destructive"
            loading={isDeletePending}
            onClick={confirmDelete}
          >
            {t("actions.delete")}
          </ActionButton>
        )}
      />
    </>
  );
}
