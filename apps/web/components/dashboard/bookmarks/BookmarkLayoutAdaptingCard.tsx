"use client";

import type { BookmarksLayoutTypes } from "@/lib/userLocalSettings/types";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";
import { BOOKMARK_DRAG_MIME } from "@/lib/bookmark-drag";
import useBulkActionsStore from "@/lib/bulkActions";
import { useClientConfig } from "@/lib/clientConfig";
import { useTranslation } from "@/lib/i18n/client";
import {
  bookmarkLayoutSwitch,
  COMPACT_GRID_SIZE_METRICS,
  useBookmarkDisplaySettings,
  useBookmarkLayout,
  useCompactGridIconSize,
} from "@/lib/userLocalSettings/bookmarksLayout";
import { useUserSettings } from "@/lib/userSettings";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Circle,
  CircleCheck,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Maximize2,
  MoreHorizontal,
  NotebookPen,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useBookmarkListContext } from "@karakeep/shared-react/hooks/bookmark-list-context";
import { useUpdateBookmark } from "@karakeep/shared-react/hooks/bookmarks";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkTitle,
  getFallbackFaviconUrl,
  isBookmarkStillTagging,
} from "@karakeep/shared/utils/bookmarkUtils";
import { switchCase } from "@karakeep/shared/utils/switch";

import BookmarkActionBar from "./BookmarkActionBar";
import BookmarkFormattedCreatedAt from "./BookmarkFormattedCreatedAt";
import BookmarkOptions from "./BookmarkOptions";
import BookmarkOwnerIcon from "./BookmarkOwnerIcon";
import { ArchivedActionIcon, FavouritedActionIcon } from "./icons";
import { NotePreview } from "./NotePreview";
import TagList from "./TagList";

interface Props {
  bookmark: ZBookmark;
  image: (layout: BookmarksLayoutTypes, className: string) => ReactNode;
  title?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
  className?: string;
  fitHeight?: boolean;
  wrapTags: boolean;
  bookmarkIndex?: number;
}

function BottomRow({
  footer,
  bookmark,
}: {
  footer?: ReactNode;
  bookmark: ZBookmark;
}) {
  return (
    <div className="justify flex w-full shrink-0 justify-between text-gray-500">
      <div className="flex items-center gap-2 overflow-hidden text-nowrap font-light">
        {footer && <>{footer}•</>}
        <Link
          href={`/dashboard/preview/${bookmark.id}`}
          suppressHydrationWarning
        >
          <BookmarkFormattedCreatedAt createdAt={bookmark.createdAt} />
        </Link>
      </div>
      <BookmarkActionBar bookmark={bookmark} />
    </div>
  );
}

function OwnerIndicator({ bookmark }: { bookmark: ZBookmark }) {
  const api = useTRPC();
  const listContext = useBookmarkListContext();
  const collaborators = useQuery(
    api.lists.getCollaborators.queryOptions(
      {
        listId: listContext?.id ?? "",
      },
      {
        refetchOnWindowFocus: false,
        enabled: !!listContext?.hasCollaborators,
      },
    ),
  );

  if (!listContext || listContext.userRole === "owner" || !collaborators.data) {
    return null;
  }

  let owner = undefined;
  if (bookmark.userId === collaborators.data.owner?.id) {
    owner = collaborators.data.owner;
  } else {
    owner = collaborators.data.collaborators.find(
      (c) => c.userId === bookmark.userId,
    )?.user;
  }

  if (!owner) return null;

  return (
    <div className="absolute right-2 top-2 z-40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <BookmarkOwnerIcon ownerName={owner.name} ownerAvatar={owner.image} />
    </div>
  );
}

function BulkEditSelectionOverlay({ bookmark }: { bookmark: ZBookmark }) {
  const isSelected = useBulkActionsStore((s) =>
    s.isBookmarkSelected(bookmark.id),
  );
  const isBulkEditEnabled = useBulkActionsStore((s) => s.isBulkEditEnabled);
  const toggleBookmark = useBulkActionsStore((state) => state.toggleBookmark);
  const { resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const { t } = useTranslation();

  // Don't show selector for non-owned bookmarks or when bulk edit is disabled
  const isOwner = session?.user?.id === bookmark.userId;
  if (!isBulkEditEnabled || !isOwner) return null;

  return (
    <button
      className={cn(
        "absolute left-0 top-0 z-50 h-full w-full bg-opacity-0",
        {
          "bg-opacity-10": isSelected,
        },
        resolvedTheme === "dark" ? "bg-white" : "bg-black",
      )}
      aria-label={t("actions.select")}
      aria-pressed={isSelected}
      onClick={() => toggleBookmark(bookmark.id)}
    ></button>
  );
}

function DragHandle({
  bookmark,
  className,
}: {
  bookmark: ZBookmark;
  className?: string;
}) {
  const { isBulkEditEnabled } = useBulkActionsStore();
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.setData(BOOKMARK_DRAG_MIME, bookmark.id);
      e.dataTransfer.effectAllowed = "copy";

      // Create a small pill element as the drag preview
      const pill = document.createElement("div");
      const title = getBookmarkTitle(bookmark) ?? "Untitled";
      pill.textContent =
        title.length > 40 ? title.substring(0, 40) + "\u2026" : title;
      Object.assign(pill.style, {
        position: "fixed",
        left: "-9999px",
        top: "-9999px",
        padding: "6px 12px",
        borderRadius: "8px",
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        fontSize: "13px",
        fontFamily: "inherit",
        color: "hsl(var(--foreground))",
        maxWidth: "240px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });
      document.body.appendChild(pill);
      e.dataTransfer.setDragImage(pill, 0, 0);
      requestAnimationFrame(() => pill.remove());
    },
    [bookmark],
  );

  if (isBulkEditEnabled) return null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "absolute z-40 hidden cursor-grab rounded bg-background/70 p-0.5 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 [@media(pointer:fine)]:block",
        className,
      )}
    >
      <GripVertical className="size-4 text-muted-foreground" />
    </div>
  );
}

function HoverActionBar({
  bookmark,
  inline = false,
}: {
  bookmark: ZBookmark;
  inline?: boolean;
}) {
  const { t } = useTranslation();
  const enableBulkEditForBookmark = useBulkActionsStore(
    (state) => state.enableBulkEditForBookmark,
  );
  const isBulkEditEnabled = useBulkActionsStore(
    (state) => state.isBulkEditEnabled,
  );
  const isSelected = useBulkActionsStore((state) =>
    state.isBookmarkSelected(bookmark.id),
  );
  const toggleBookmark = useBulkActionsStore((state) => state.toggleBookmark);
  const { data: session } = useSession();
  const demoMode = !!useClientConfig().demoMode;
  const updateBookmarkMutator = useUpdateBookmark({
    onSuccess: () => {
      toast.success(t("toasts.bookmarks.updated"));
    },
    onError: () => {
      toast.error(t("common.something_went_wrong"));
    },
  });

  const isOwner = session?.user?.id === bookmark.userId;
  if (!isOwner) return null;

  return (
    <div
      className={cn(
        "z-[60] gap-1 rounded bg-white/50 p-1 backdrop-blur-sm transition-opacity duration-200 dark:bg-black/50",
        inline ? "shrink-0" : "absolute right-2 top-2",
        isBulkEditEnabled
          ? "pointer-events-auto flex opacity-100"
          : "pointer-events-none hidden opacity-0 group-hover:opacity-100 [@media(pointer:fine)]:pointer-events-auto [@media(pointer:fine)]:flex",
      )}
    >
      <button
        aria-label={t("actions.bulk_edit")}
        title={t("actions.bulk_edit")}
        className="rounded p-0.5 hover:bg-background/50"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isBulkEditEnabled) {
            toggleBookmark(bookmark.id);
          } else {
            enableBulkEditForBookmark(bookmark.id);
          }
        }}
      >
        {isSelected ? (
          <CircleCheck className="size-4" />
        ) : (
          <Circle className="size-4" />
        )}
      </button>
      {!demoMode && (
        <>
          <button
            title={
              bookmark.favourited
                ? t("actions.unfavorite")
                : t("actions.favorite")
            }
            className="rounded p-0.5 hover:bg-background/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateBookmarkMutator.mutate({
                bookmarkId: bookmark.id,
                favourited: !bookmark.favourited,
              });
            }}
          >
            <FavouritedActionIcon favourited={bookmark.favourited} size={16} />
          </button>
          <button
            title={
              bookmark.archived ? t("actions.unarchive") : t("actions.archive")
            }
            className="rounded p-0.5 hover:bg-background/50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateBookmarkMutator.mutate({
                bookmarkId: bookmark.id,
                archived: !bookmark.archived,
              });
            }}
          >
            <ArchivedActionIcon archived={bookmark.archived} size={16} />
          </button>
        </>
      )}
    </div>
  );
}

function ListView({
  bookmark,
  image,
  title,
  content,
  footer,
  className,
  bookmarkIndex,
}: Props) {
  const { showNotes, showTags, showTitle, imageFit } =
    useBookmarkDisplaySettings();
  const imgFitClass = switchCase(imageFit, {
    cover: "object-cover",
    contain: "object-contain",
  });
  const note = showNotes ? bookmark.note?.trim() : undefined;

  return (
    <div
      className={cn(
        "group relative flex max-h-96 gap-4 overflow-hidden rounded-lg p-2",
        className,
      )}
      data-bookmark-index={bookmarkIndex}
    >
      <BulkEditSelectionOverlay bookmark={bookmark} />
      <OwnerIndicator bookmark={bookmark} />
      <DragHandle
        bookmark={bookmark}
        className="left-1 top-1/2 -translate-y-1/2"
      />
      <HoverActionBar bookmark={bookmark} />
      <div className="flex size-32 items-center justify-center overflow-hidden">
        {image("list", cn("size-32 rounded-lg", imgFitClass))}
      </div>
      <div className="flex h-full flex-1 flex-col justify-between gap-2 overflow-hidden">
        <div className="flex flex-col gap-2 overflow-hidden">
          {showTitle && title && (
            <div className="line-clamp-2 flex-none shrink-0 overflow-hidden text-ellipsis break-words text-lg">
              {title}
            </div>
          )}
          {content && <div className="shrink-1 overflow-hidden">{content}</div>}
          {note && <NotePreview note={note} bookmarkId={bookmark.id} />}
          {showTags && (
            <div className="flex shrink-0 flex-wrap gap-1 overflow-hidden">
              <TagList
                bookmark={bookmark}
                loading={isBookmarkStillTagging(bookmark)}
              />
            </div>
          )}
        </div>
        <BottomRow footer={footer} bookmark={bookmark} />
      </div>
    </div>
  );
}

function GridView({
  bookmark,
  image,
  title,
  content,
  footer,
  className,
  wrapTags,
  layout,
  fitHeight = false,
  bookmarkIndex,
}: Props & { layout: BookmarksLayoutTypes }) {
  const { showNotes, showTags, showTitle, imageFit } =
    useBookmarkDisplaySettings();
  const imgFitClass = switchCase(imageFit, {
    cover: "object-cover",
    contain: "object-contain",
  });
  const note = showNotes ? bookmark.note?.trim() : undefined;
  const img = image(
    "grid",
    cn("h-56 min-h-56 w-full rounded-t-lg", imgFitClass),
  );

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg",
        className,
        fitHeight && layout != "grid" ? "max-h-96" : "h-96",
      )}
      data-bookmark-index={bookmarkIndex}
    >
      <BulkEditSelectionOverlay bookmark={bookmark} />
      <OwnerIndicator bookmark={bookmark} />
      <DragHandle bookmark={bookmark} className="left-2 top-2" />
      <HoverActionBar bookmark={bookmark} />
      {img && <div className="h-56 w-full shrink-0 overflow-hidden">{img}</div>}
      <div className="flex h-full flex-col justify-between gap-2 overflow-hidden p-2">
        <div className="grow-1 flex flex-col gap-2 overflow-hidden">
          {showTitle && title && (
            <div className="line-clamp-2 flex-none shrink-0 overflow-hidden text-ellipsis break-words text-lg">
              {title}
            </div>
          )}
          {content && <div className="shrink-1 overflow-hidden">{content}</div>}
          {note && <NotePreview note={note} bookmarkId={bookmark.id} />}
          {showTags && (
            <div className="flex shrink-0 flex-wrap gap-1 overflow-hidden">
              <TagList
                className={wrapTags ? undefined : "h-full"}
                bookmark={bookmark}
                loading={isBookmarkStillTagging(bookmark)}
              />
            </div>
          )}
        </div>
        <BottomRow footer={footer} bookmark={bookmark} />
      </div>
    </div>
  );
}

function useResolvedFaviconUrl(
  favicon: string | null | undefined,
  pageUrl: string | undefined,
) {
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setPrimaryFailed(false);
    setFallbackFailed(false);
  }, [favicon, pageUrl]);

  const primary = favicon?.trim() || null;
  const fallback = pageUrl ? getFallbackFaviconUrl(pageUrl) : null;

  if (primary && !primaryFailed) {
    return { src: primary, onError: () => setPrimaryFailed(true) };
  }
  if (fallback && fallback !== primary && !fallbackFailed) {
    return { src: fallback, onError: () => setFallbackFailed(true) };
  }
  return { src: null, onError: undefined };
}

function CompactView({
  bookmark,
  title,
  footer,
  className,
  bookmarkIndex,
}: Props) {
  const { showTitle } = useBookmarkDisplaySettings();
  const isBulkEditEnabled = useBulkActionsStore(
    (state) => state.isBulkEditEnabled,
  );
  const favicon = useResolvedFaviconUrl(
    bookmark.content.type === BookmarkTypes.LINK
      ? bookmark.content.favicon
      : null,
    bookmark.content.type === BookmarkTypes.LINK
      ? bookmark.content.url
      : undefined,
  );
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg",
        className,
        "max-h-96",
      )}
      data-bookmark-index={bookmarkIndex}
    >
      <BulkEditSelectionOverlay bookmark={bookmark} />
      <OwnerIndicator bookmark={bookmark} />
      <div className="flex h-full justify-between gap-2 overflow-hidden p-2">
        <div className="flex items-center gap-2">
          {bookmark.content.type === BookmarkTypes.LINK &&
            (favicon.src ? (
              <Image
                src={favicon.src}
                alt="favicon"
                width={5}
                unoptimized
                height={5}
                onError={favicon.onError}
                className="size-5 object-contain"
              />
            ) : (
              <Globe className="size-5 text-muted-foreground" />
            ))}
          {bookmark.content.type === BookmarkTypes.TEXT && (
            <NotebookPen className="size-5" />
          )}
          {bookmark.content.type === BookmarkTypes.ASSET && (
            <ImageIcon className="size-5" />
          )}
          {showTitle && (
            <div className="shrink-1 text-md line-clamp-1 overflow-hidden text-ellipsis break-words">
              {title ?? "Untitled"}
            </div>
          )}
          {footer && (
            <p className="flex shrink-0 gap-2 text-gray-500">•{footer}</p>
          )}
          <p className="text-gray-500">•</p>
          <Link
            href={`/dashboard/preview/${bookmark.id}`}
            suppressHydrationWarning
            className="shrink-0 gap-2 text-gray-500"
          >
            <BookmarkFormattedCreatedAt createdAt={bookmark.createdAt} />
          </Link>
        </div>
        <div className="relative z-[60] flex shrink-0 items-center">
          <HoverActionBar bookmark={bookmark} inline />
          <BookmarkActionBar
            bookmark={bookmark}
            favouritedClassName={cn(
              "group-hover:hidden",
              isBulkEditEnabled && "hidden",
            )}
          />
        </div>
      </div>
    </div>
  );
}

function CompactGridView({ bookmark, className, bookmarkIndex }: Props) {
  const { showTitle } = useBookmarkDisplaySettings();
  const iconSize = useCompactGridIconSize();
  const metrics = COMPACT_GRID_SIZE_METRICS[iconSize];
  const userSettings = useUserSettings();
  const favicon = useResolvedFaviconUrl(
    bookmark.content.type === BookmarkTypes.LINK
      ? bookmark.content.favicon
      : null,
    bookmark.content.type === BookmarkTypes.LINK
      ? bookmark.content.url
      : undefined,
  );

  const href =
    bookmark.content.type === BookmarkTypes.LINK &&
    userSettings.bookmarkClickAction !== "expand_bookmark_preview"
      ? bookmark.content.url
      : `/dashboard/preview/${bookmark.id}`;
  const target =
    bookmark.content.type === BookmarkTypes.LINK &&
    userSettings.bookmarkClickAction === "open_original_link"
      ? ("_blank" as const)
      : ("_self" as const);

  let label = getBookmarkTitle(bookmark);
  if (!label && bookmark.content.type === BookmarkTypes.LINK) {
    try {
      label = new URL(bookmark.content.url).host;
    } catch {
      label = bookmark.content.url;
    }
  }
  label = label ?? "Untitled";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center rounded-xl p-1",
        className,
      )}
      style={{ width: `${metrics.tileWidth}px` }}
      data-bookmark-index={bookmarkIndex}
    >
      <BulkEditSelectionOverlay bookmark={bookmark} />
      <OwnerIndicator bookmark={bookmark} />
      <div className="pointer-events-none absolute left-0 top-0 z-[60] hidden items-center gap-0.5 rounded bg-white/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-black/80 [@media(pointer:fine)]:pointer-events-auto [@media(pointer:fine)]:flex">
        <Link
          href={`/dashboard/preview/${bookmark.id}`}
          className="rounded p-0.5 hover:bg-background/50"
          onClick={(e) => e.stopPropagation()}
        >
          <Maximize2 className="size-3.5 text-muted-foreground" />
        </Link>
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-[60] hidden items-center gap-0.5 rounded bg-white/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 dark:bg-black/80 [@media(pointer:fine)]:pointer-events-auto [@media(pointer:fine)]:flex">
        <BookmarkOptions
          bookmark={bookmark}
          trigger={
            <button
              type="button"
              className="rounded p-0.5 hover:bg-background/50"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5 text-muted-foreground" />
            </button>
          }
        />
      </div>
      <Link
        href={href}
        target={target}
        rel="noreferrer"
        title={label}
        className="flex w-full flex-col items-center gap-1.5 overflow-hidden focus:outline-none"
      >
        <div
          className={cn(
            "flex items-center justify-center border border-border/50 bg-card shadow-sm transition-transform duration-150 group-hover:scale-105 group-hover:shadow-md",
            metrics.boxClass,
          )}
        >
          {bookmark.content.type === BookmarkTypes.LINK &&
            (favicon.src ? (
              <Image
                src={favicon.src}
                alt="favicon"
                width={metrics.faviconPx}
                height={metrics.faviconPx}
                unoptimized
                onError={favicon.onError}
                className={cn("object-contain", metrics.faviconClass)}
              />
            ) : (
              <Globe
                className={cn(
                  "text-muted-foreground",
                  metrics.fallbackIconClass,
                )}
              />
            ))}
          {bookmark.content.type === BookmarkTypes.TEXT && (
            <NotebookPen
              className={cn("text-muted-foreground", metrics.fallbackIconClass)}
            />
          )}
          {bookmark.content.type === BookmarkTypes.ASSET && (
            <ImageIcon
              className={cn("text-muted-foreground", metrics.fallbackIconClass)}
            />
          )}
        </div>
        {showTitle && (
          <span
            className={cn(
              "block w-full truncate text-center font-normal text-foreground",
              metrics.titleClass,
            )}
          >
            {label}
          </span>
        )}
      </Link>
    </div>
  );
}

export function BookmarkLayoutAdaptingCard(props: Props) {
  const layout = useBookmarkLayout();

  return bookmarkLayoutSwitch(layout, {
    masonry: <GridView layout={layout} {...props} />,
    grid: <GridView layout={layout} {...props} />,
    list: <ListView {...props} />,
    compact: <CompactView {...props} />,
    "compact-grid": <CompactGridView {...props} />,
  });
}
