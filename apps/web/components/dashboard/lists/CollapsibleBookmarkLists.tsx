"use client";

import { useEffect, useRef, useState } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { useSortOrderStore } from "@/lib/store/useSortOrderStore";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useBookmarkLists } from "@karakeep/shared-react/hooks/lists";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { ZBookmarkList } from "@karakeep/shared/types/lists";
import { ZBookmarkListTreeNode } from "@karakeep/shared/utils/listUtils";

type RenderFunc = (params: {
  node: ZBookmarkListTreeNode;
  level: number;
  open: boolean;
  onOpenChange: (open: boolean, options?: { fromLinkClick?: boolean }) => void;
  numBookmarks?: number;
  groupKey: string;
  siblingIds: string[];
}) => React.ReactNode;

type IsOpenFunc = (list: ZBookmarkListTreeNode) => boolean;

function sortListNodes(
  nodes: ZBookmarkListTreeNode[],
  savedOrder: string[] | undefined,
): ZBookmarkListTreeNode[] {
  const alpha = [...nodes].sort((a, b) =>
    a.item.name.localeCompare(b.item.name),
  );
  if (!savedOrder?.length) return alpha;
  const pos = new Map(savedOrder.map((id, i) => [id, i]));
  return [...alpha].sort((a, b) => {
    const ia = pos.get(a.item.id);
    const ib = pos.get(b.item.id);
    if (ia === undefined && ib === undefined) return 0;
    if (ia === undefined) return 1;
    if (ib === undefined) return -1;
    return ia - ib;
  });
}

function ListItem({
  node,
  render,
  level,
  className,
  isOpenFunc,
  listStats,
  indentOffset,
  groupKey,
  siblingIds,
  customListOrders,
}: {
  node: ZBookmarkListTreeNode;
  render: RenderFunc;
  isOpenFunc: IsOpenFunc;
  listStats?: Map<string, number>;
  level: number;
  indentOffset: number;
  className?: string;
  groupKey: string;
  siblingIds: string[];
  customListOrders: Record<string, string[]>;
}) {
  // Not the most efficient way to do this, but it works for now
  const isAnyChildOpen = (
    node: ZBookmarkListTreeNode,
    isOpenFunc: IsOpenFunc,
  ): boolean => {
    if (isOpenFunc(node)) {
      return true;
    }
    return node.children.some((l) => isAnyChildOpen(l, isOpenFunc));
  };
  const [open, setOpen] = useState(false);
  const skipNextAutoOpenRef = useRef(false);

  useEffect(() => {
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }
    setOpen((curr) => curr || isAnyChildOpen(node, isOpenFunc));
  }, [node, isOpenFunc]);

  const handleOpenChange = (
    nextOpen: boolean,
    options?: { fromLinkClick?: boolean },
  ) => {
    if (!nextOpen && options?.fromLinkClick && !isOpenFunc(node)) {
      skipNextAutoOpenRef.current = true;
    }
    setOpen(nextOpen);
  };

  const childGroupKey = `parent:${node.item.id}`;
  const sortedChildren = sortListNodes(
    node.children,
    customListOrders[childGroupKey],
  );
  const childSiblingIds = sortedChildren.map((c) => c.item.id);

  return (
    <Collapsible
      open={open}
      onOpenChange={handleOpenChange}
      className={className}
    >
      {render({
        node,
        level: level + indentOffset,
        open,
        onOpenChange: handleOpenChange,
        numBookmarks: listStats?.get(node.item.id),
        groupKey,
        siblingIds,
      })}
      <CollapsibleContent>
        {sortedChildren.map((l) => (
          <ListItem
            isOpenFunc={isOpenFunc}
            key={l.item.id}
            node={l}
            render={render}
            level={level + 1}
            indentOffset={indentOffset}
            listStats={listStats}
            className={className}
            groupKey={childGroupKey}
            siblingIds={childSiblingIds}
            customListOrders={customListOrders}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CollapsibleBookmarkLists({
  render,
  initialData,
  listsData,
  className,
  isOpenFunc,
  filter,
  indentOffset = 0,
  groupPrefix = "root",
}: {
  initialData?: ZBookmarkList[];
  listsData?: {
    data: ZBookmarkList[];
    root: Record<string, ZBookmarkListTreeNode>;
    allPaths: ZBookmarkList[][];
    getPathById: (id: string) => ZBookmarkList[] | undefined;
  };
  render: RenderFunc;
  isOpenFunc?: IsOpenFunc;
  className?: string;
  filter?: (node: ZBookmarkListTreeNode) => boolean;
  indentOffset?: number;
  groupPrefix?: string;
}) {
  const api = useTRPC();
  const customListOrders = useSortOrderStore((state) => state.customListOrders);
  // If listsData is provided, use it directly. Otherwise, fetch it.
  let { data: fetchedData } = useBookmarkLists(undefined, {
    initialData: initialData ? { lists: initialData } : undefined,
    enabled: !listsData, // Only fetch if listsData is not provided
  });
  const data = listsData || fetchedData;

  const { data: listStats } = useQuery(
    api.lists.stats.queryOptions(undefined, {
      placeholderData: keepPreviousData,
    }),
  );

  if (!data) {
    return <FullPageSpinner />;
  }

  const rootNodes = Object.values(data.root);
  const filteredRoots = filter ? rootNodes.filter(filter) : rootNodes;
  const sortedRoots = sortListNodes(
    filteredRoots,
    customListOrders[groupPrefix],
  );
  const rootSiblingIds = sortedRoots.map((n) => n.item.id);

  return (
    <div>
      {sortedRoots.map((node) => (
        <ListItem
          key={node.item.id}
          node={node}
          render={render}
          level={0}
          indentOffset={indentOffset}
          className={className}
          listStats={listStats?.stats}
          isOpenFunc={isOpenFunc ?? (() => false)}
          groupKey={groupPrefix}
          siblingIds={rootSiblingIds}
          customListOrders={customListOrders}
        />
      ))}
    </div>
  );
}
