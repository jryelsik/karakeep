"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SidebarItem from "@/components/shared/sidebar/SidebarItem";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTriggerChevron,
} from "@/components/ui/collapsible";
import { toast } from "@/components/ui/sonner";
import {
  BOOKMARK_DRAG_MIME,
  LIST_DRAG_MIME,
  LIST_GROUP_MIME,
} from "@/lib/bookmark-drag";
import { useTranslation } from "@/lib/i18n/client";
import { useSortOrderStore } from "@/lib/store/useSortOrderStore";
import { useSidebarCollapsed } from "@/lib/userLocalSettings/bookmarksLayout";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Plus } from "lucide-react";

import type { ZBookmarkList } from "@karakeep/shared/types/lists";
import {
  augmentBookmarkListsWithInitialData,
  useAddBookmarkToList,
  useBookmarkLists,
} from "@karakeep/shared-react/hooks/lists";
import { ZBookmarkListTreeNode } from "@karakeep/shared/utils/listUtils";

import { CollapsibleBookmarkLists } from "../lists/CollapsibleBookmarkLists";
import { EditListModal } from "../lists/EditListModal";
import { ListOptions } from "../lists/ListOptions";
import { InvitationNotificationBadge } from "./InvitationNotificationBadge";

function useDropTarget(listId: string, listName: string) {
  const { mutateAsync: addToList } = useAddBookmarkToList();
  const [dropHighlight, setDropHighlight] = useState(false);
  const dragCounterRef = useRef(0);
  const { t } = useTranslation();

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)) {
      e.preventDefault();
      dragCounterRef.current++;
      setDropHighlight(true);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropHighlight(false);
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      dragCounterRef.current = 0;
      setDropHighlight(false);
      const bookmarkId = e.dataTransfer.getData(BOOKMARK_DRAG_MIME);
      if (!bookmarkId) return;
      e.preventDefault();
      try {
        await addToList({ bookmarkId, listId });
        toast({
          description: t("lists.add_to_list_success", {
            list: listName,
            defaultValue: `Added to "${listName}"`,
          }),
        });
      } catch {
        toast({
          description: t("common.something_went_wrong", {
            defaultValue: "Something went wrong",
          }),
          variant: "destructive",
        });
      }
    },
    [addToList, listId, listName, t],
  );

  return { dropHighlight, onDragOver, onDragEnter, onDragLeave, onDrop };
}

function DroppableListSidebarItem({
  node,
  level,
  open,
  onOpenChange,
  numBookmarks,
  selectedListId,
  setSelectedListId,
  groupKey,
  siblingIds,
  draggedList,
  setDraggedList,
  dragOverListId,
  setDragOverListId,
  onReorderLists,
}: {
  node: ZBookmarkListTreeNode;
  level: number;
  open: boolean;
  onOpenChange: (open: boolean, options?: { fromLinkClick?: boolean }) => void;
  numBookmarks?: number;
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
  groupKey: string;
  siblingIds: string[];
  draggedList: { id: string; groupKey: string } | null;
  setDraggedList: (dragged: { id: string; groupKey: string } | null) => void;
  dragOverListId: string | null;
  setDragOverListId: (id: string | null) => void;
  onReorderLists: (
    groupKey: string,
    visibleIds: string[],
    fromId: string,
    toId: string,
  ) => void;
}) {
  const { t } = useTranslation();
  const canDrop =
    node.item.type === "manual" &&
    (node.item.userRole === "owner" || node.item.userRole === "editor");
  const { dropHighlight, onDragOver, onDragEnter, onDragLeave, onDrop } =
    useDropTarget(node.item.id, node.item.name);

  const isSameListGroup =
    draggedList !== null &&
    draggedList.groupKey === groupKey &&
    draggedList.id !== node.item.id;

  return (
    <SidebarItem
      collapseButton={
        node.children.length > 0 ? (
          <CollapsibleTriggerChevron
            className="size-4"
            open={open}
            aria-label={t(open ? "actions.collapse" : "actions.expand")}
          />
        ) : (
          <span className="size-4" />
        )
      }
      logo={
        <span className="flex">
          <span className="text-lg"> {node.item.icon}</span>
        </span>
      }
      name={node.item.name}
      path={`/dashboard/lists/${node.item.id}`}
      className={cn("group", draggedList?.id === node.item.id && "opacity-40")}
      draggable
      onLinkClick={
        node.children.length > 0
          ? (e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                onOpenChange(!open, { fromLinkClick: true });
              }
            }
          : undefined
      }
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(LIST_DRAG_MIME, node.item.id);
        e.dataTransfer.setData(LIST_GROUP_MIME, groupKey);
        e.dataTransfer.effectAllowed = "move";
        setDraggedList({ id: node.item.id, groupKey });
      }}
      onDragEnd={() => {
        setDraggedList(null);
        setDragOverListId(null);
      }}
      right={
        <ListOptions
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setSelectedListId(node.item.id);
            } else {
              setSelectedListId(null);
            }
          }}
          list={node.item}
        >
          <Button
            size="none"
            variant="ghost"
            className="relative"
            aria-label={t("actions.more_options")}
          >
            <MoreHorizontal
              className={cn(
                "absolute inset-0 m-auto size-4 opacity-0 transition-opacity duration-100 group-hover:opacity-100",
                selectedListId == node.item.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span
              className={cn(
                "px-2.5 text-xs font-light text-muted-foreground opacity-100 transition-opacity duration-100 group-hover:opacity-0",
                selectedListId == node.item.id || numBookmarks === undefined
                  ? "opacity-0"
                  : "opacity-100",
              )}
            >
              {numBookmarks}
            </span>
          </Button>
        </ListOptions>
      }
      linkClassName="py-0.5 px-1"
      style={{ marginLeft: `${level * 1}rem` }}
      dropHighlight={
        (canDrop && dropHighlight) || dragOverListId === node.item.id
      }
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(LIST_DRAG_MIME)) {
          if (isSameListGroup) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            if (dragOverListId !== node.item.id) {
              setDragOverListId(node.item.id);
            }
          }
          return;
        }
        if (canDrop) onDragOver(e);
      }}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes(LIST_DRAG_MIME)) {
          if (isSameListGroup) {
            e.preventDefault();
            e.stopPropagation();
            setDragOverListId(node.item.id);
          }
          return;
        }
        if (canDrop) onDragEnter(e);
      }}
      onDragLeave={(e) => {
        if (dragOverListId === node.item.id) {
          if (
            !e.relatedTarget ||
            !e.currentTarget.contains(e.relatedTarget as Node)
          ) {
            setDragOverListId(null);
          }
        }
        if (canDrop) onDragLeave();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes(LIST_DRAG_MIME)) {
          const fromId =
            draggedList?.id || e.dataTransfer.getData(LIST_DRAG_MIME);
          const fromGroup =
            draggedList?.groupKey || e.dataTransfer.getData(LIST_GROUP_MIME);
          setDraggedList(null);
          setDragOverListId(null);
          if (!fromId || fromGroup !== groupKey || fromId === node.item.id) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          onReorderLists(groupKey, siblingIds, fromId, node.item.id);
          return;
        }
        if (canDrop) void onDrop(e);
      }}
    />
  );
}

export default function AllLists({
  initialData,
}: {
  initialData: { lists: ZBookmarkList[] };
}) {
  const { t } = useTranslation();
  const collapsed = useSidebarCollapsed();
  const pathName = usePathname();
  const isNodeOpen = useCallback(
    (node: ZBookmarkListTreeNode) => pathName.includes(node.item.id),
    [pathName],
  );

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [draggedList, setDraggedList] = useState<{
    id: string;
    groupKey: string;
  } | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const reorderLists = useSortOrderStore((state) => state.reorderLists);

  // Fetch live lists data
  const { data: listsData } = useBookmarkLists(undefined, {
    initialData: { lists: initialData.lists },
  });
  const lists = augmentBookmarkListsWithInitialData(
    listsData,
    initialData.lists,
  );

  // Check if any shared list is currently being viewed
  const isViewingSharedList = useMemo(() => {
    return lists.data.some(
      (list) => list.userRole !== "owner" && pathName.includes(list.id),
    );
  }, [lists.data, pathName]);

  // Check if there are any shared lists
  const hasSharedLists = useMemo(() => {
    return lists.data.some((list) => list.userRole !== "owner");
  }, [lists.data]);

  const [sharedListsOpen, setSharedListsOpen] = useState(isViewingSharedList);

  // Auto-open shared lists if viewing one
  useEffect(() => {
    if (isViewingSharedList && !sharedListsOpen) {
      setSharedListsOpen(true);
    }
  }, [isViewingSharedList, sharedListsOpen]);

  return (
    <ul className="sidebar-scrollbar max-h-full w-full gap-y-2 overflow-auto text-sm">
      <li
        className={cn(
          "flex pb-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <p className="pl-2 text-xs uppercase tracking-wider text-muted-foreground">
            Lists
          </p>
        )}
        <EditListModal>
          <button
            type="button"
            aria-label={t("lists.new_list")}
            title={t("lists.new_list")}
          >
            <Plus
              className={cn(
                "size-4 text-muted-foreground",
                !collapsed && "mr-2",
              )}
              strokeWidth={1.5}
            />
          </button>
        </EditListModal>
      </li>
      <SidebarItem
        collapseButton={<span className="size-4" />}
        logo={<span className="text-lg">📋</span>}
        name={t("lists.all_lists")}
        path={`/dashboard/lists`}
        linkClassName="py-0.5 px-1"
        right={<InvitationNotificationBadge />}
      />
      <SidebarItem
        collapseButton={<span className="size-4" />}
        logo={<span className="text-lg">⭐️</span>}
        name={t("lists.favourites")}
        path={`/dashboard/favourites`}
        linkClassName="py-0.5 px-1"
      />

      {/* Owned Lists */}
      <CollapsibleBookmarkLists
        listsData={lists}
        groupPrefix="root:owner"
        filter={(node) => node.item.userRole === "owner"}
        isOpenFunc={isNodeOpen}
        render={({
          node,
          level,
          open,
          onOpenChange,
          numBookmarks,
          groupKey,
          siblingIds,
        }) => (
          <DroppableListSidebarItem
            node={node}
            level={level}
            open={open}
            onOpenChange={onOpenChange}
            numBookmarks={numBookmarks}
            selectedListId={selectedListId}
            setSelectedListId={setSelectedListId}
            groupKey={groupKey}
            siblingIds={siblingIds}
            draggedList={draggedList}
            setDraggedList={setDraggedList}
            dragOverListId={dragOverListId}
            setDragOverListId={setDragOverListId}
            onReorderLists={reorderLists}
          />
        )}
      />

      {/* Shared Lists */}
      {hasSharedLists && (
        <Collapsible open={sharedListsOpen} onOpenChange={setSharedListsOpen}>
          <SidebarItem
            collapseButton={
              <CollapsibleTriggerChevron
                className="size-4"
                open={sharedListsOpen}
                aria-label={t(
                  sharedListsOpen ? "actions.collapse" : "actions.expand",
                )}
              />
            }
            logo={<span className="text-lg">👥</span>}
            name={t("lists.shared_lists")}
            path="#"
            linkClassName="py-0.5 px-1"
            onLinkClick={(e) => {
              e.preventDefault();
              setSharedListsOpen((prev) => !prev);
            }}
          />
          <CollapsibleContent>
            <CollapsibleBookmarkLists
              listsData={lists}
              groupPrefix="root:shared"
              filter={(node) => node.item.userRole !== "owner"}
              isOpenFunc={isNodeOpen}
              indentOffset={1}
              render={({
                node,
                level,
                open,
                onOpenChange,
                numBookmarks,
                groupKey,
                siblingIds,
              }) => (
                <DroppableListSidebarItem
                  node={node}
                  level={level}
                  open={open}
                  onOpenChange={onOpenChange}
                  numBookmarks={numBookmarks}
                  selectedListId={selectedListId}
                  setSelectedListId={setSelectedListId}
                  groupKey={groupKey}
                  siblingIds={siblingIds}
                  draggedList={draggedList}
                  setDraggedList={setDraggedList}
                  dragOverListId={dragOverListId}
                  setDragOverListId={setDragOverListId}
                  onReorderLists={reorderLists}
                />
              )}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </ul>
  );
}
