"use client";

import type { z } from "zod";
import { createContext, useContext } from "react";
import { fallbackLng } from "@/lib/i18n/settings";

import type {
  BookmarksLayoutTypes,
  CompactGridIconSize,
  zUserLocalSettings,
} from "./types";

export const COMPACT_GRID_SIZE_METRICS: Record<
  CompactGridIconSize,
  {
    tileWidth: number;
    gap: number;
    boxClass: string;
    faviconPx: number;
    faviconClass: string;
    fallbackIconClass: string;
    titleClass: string;
  }
> = {
  tiny: {
    tileWidth: 64,
    gap: 12,
    boxClass: "size-9 rounded-lg",
    faviconPx: 20,
    faviconClass: "size-5",
    fallbackIconClass: "size-4",
    titleClass: "text-[10px]",
  },
  small: {
    tileWidth: 76,
    gap: 16,
    boxClass: "size-12 rounded-xl",
    faviconPx: 28,
    faviconClass: "size-7",
    fallbackIconClass: "size-6",
    titleClass: "text-[11px]",
  },
  medium: {
    tileWidth: 100,
    gap: 20,
    boxClass: "size-16 rounded-2xl",
    faviconPx: 36,
    faviconClass: "size-9",
    fallbackIconClass: "size-8",
    titleClass: "text-xs",
  },
  large: {
    tileWidth: 120,
    gap: 24,
    boxClass: "size-20 rounded-2xl",
    faviconPx: 44,
    faviconClass: "size-11",
    fallbackIconClass: "size-10",
    titleClass: "text-xs",
  },
  huge: {
    tileWidth: 140,
    gap: 28,
    boxClass: "size-24 rounded-3xl",
    faviconPx: 56,
    faviconClass: "size-14",
    fallbackIconClass: "size-12",
    titleClass: "text-sm",
  },
};

const defaultLayout: BookmarksLayoutTypes = "masonry";

export const UserLocalSettingsCtx = createContext<
  z.infer<typeof zUserLocalSettings>
>({
  bookmarkGridLayout: defaultLayout,
  lang: fallbackLng,
  gridColumns: 3,
  compactGridColumns: 6,
  compactGridIconSize: "small",
  showNotes: false,
  showTags: true,
  showTitle: true,
  showEditorCard: true,
  imageFit: "cover",
  sidebarCollapsed: false,
});

function useUserLocalSettings() {
  return useContext(UserLocalSettingsCtx);
}

export function useBookmarkDisplaySettings() {
  const settings = useUserLocalSettings();
  return {
    showNotes: settings.showNotes,
    showTags: settings.showTags,
    showTitle: settings.showTitle,
    showEditorCard: settings.showEditorCard,
    imageFit: settings.imageFit,
  };
}

export function useBookmarkLayout() {
  const settings = useUserLocalSettings();
  return settings.bookmarkGridLayout;
}

export function useInterfaceLang() {
  const settings = useUserLocalSettings();
  return settings.lang;
}

export function useGridColumns() {
  const settings = useUserLocalSettings();
  return settings.gridColumns;
}

export function useCompactGridColumns() {
  const settings = useUserLocalSettings();
  return settings.compactGridColumns;
}

export function useCompactGridIconSize() {
  const settings = useUserLocalSettings();
  return settings.compactGridIconSize;
}

export function useSidebarCollapsed() {
  const settings = useUserLocalSettings();
  return settings.sidebarCollapsed;
}

export function bookmarkLayoutSwitch<T>(
  layout: BookmarksLayoutTypes,
  data: Record<BookmarksLayoutTypes, T>,
) {
  return data[layout];
}

export function useBookmarkLayoutSwitch<T>(
  data: Record<BookmarksLayoutTypes, T>,
) {
  const layout = useBookmarkLayout();
  return data[layout];
}
