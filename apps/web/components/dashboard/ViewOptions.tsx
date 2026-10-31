"use client";

import {
  createElement,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { ButtonWithTooltip } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/lib/i18n/client";
import {
  useBookmarkDisplaySettings,
  useBookmarkLayout,
  useCompactGridColumns,
  useGridColumns,
} from "@/lib/userLocalSettings/bookmarksLayout";
import { COMPACT_GRID_COLUMN_STEPS } from "@/lib/userLocalSettings/types";
import {
  updateBookmarksLayout,
  updateCompactGridColumns,
  updateGridColumns,
  updateImageFit,
  updateShowEditorCard,
  updateShowNotes,
  updateShowTags,
  updateShowTitle,
} from "@/lib/userLocalSettings/userLocalSettings";
import {
  Check,
  Grip,
  Heading,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  List,
  LucideIcon,
  NotepadText,
  PlusSquare,
  Settings,
  Tag,
} from "lucide-react";

type LayoutType = "masonry" | "grid" | "list" | "compact" | "compact-grid";

const iconMap: Record<LayoutType, LucideIcon> = {
  masonry: LayoutDashboard,
  grid: LayoutGrid,
  list: LayoutList,
  compact: List,
  "compact-grid": Grip,
};

export default function ViewOptions() {
  const { t } = useTranslation();
  const layout = useBookmarkLayout();
  const gridColumns = useGridColumns();
  const compactGridColumns = useCompactGridColumns();
  const actualDisplaySettings = useBookmarkDisplaySettings();
  const [tempColumns, setTempColumns] = useState(gridColumns);
  const [tempCompactStepIndex, setTempCompactStepIndex] = useState(() => {
    const idx = COMPACT_GRID_COLUMN_STEPS.indexOf(
      compactGridColumns as (typeof COMPACT_GRID_COLUMN_STEPS)[number],
    );
    return idx >= 0 ? idx : 5;
  });
  const [, startTransition] = useTransition();

  // Optimistic state for all toggles
  const [optimisticDisplaySettings, setOptimisticDisplaySettings] =
    useOptimistic(actualDisplaySettings);

  const [optimisticLayout, setOptimisticLayout] = useOptimistic(layout);

  const [optimisticImageFit, setOptimisticImageFit] = useOptimistic(
    actualDisplaySettings.imageFit,
  );

  const isCompactGrid = optimisticLayout === "compact-grid";
  const showColumnSlider =
    optimisticLayout === "grid" ||
    optimisticLayout === "masonry" ||
    isCompactGrid;

  // Update temp value when actual value changes
  useEffect(() => {
    setTempColumns(gridColumns);
  }, [gridColumns]);

  useEffect(() => {
    const idx = COMPACT_GRID_COLUMN_STEPS.indexOf(
      compactGridColumns as (typeof COMPACT_GRID_COLUMN_STEPS)[number],
    );
    setTempCompactStepIndex(idx >= 0 ? idx : 5);
  }, [compactGridColumns]);

  // Handlers with optimistic updates
  const handleLayoutChange = (newLayout: LayoutType) => {
    startTransition(async () => {
      setOptimisticLayout(newLayout);
      await updateBookmarksLayout(newLayout);
    });
  };

  const handleShowNotesChange = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticDisplaySettings({
        ...optimisticDisplaySettings,
        showNotes: checked,
      });
      await updateShowNotes(checked);
    });
  };

  const handleShowTagsChange = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticDisplaySettings({
        ...optimisticDisplaySettings,
        showTags: checked,
      });
      await updateShowTags(checked);
    });
  };

  const handleShowTitleChange = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticDisplaySettings({
        ...optimisticDisplaySettings,
        showTitle: checked,
      });
      await updateShowTitle(checked);
    });
  };

  const handleShowEditorCardChange = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticDisplaySettings({
        ...optimisticDisplaySettings,
        showEditorCard: checked,
      });
      await updateShowEditorCard(checked);
    });
  };

  const handleImageFitChange = (fit: "cover" | "contain") => {
    startTransition(async () => {
      setOptimisticImageFit(fit);
      await updateImageFit(fit);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ButtonWithTooltip
          tooltip={t("view_options.title")}
          delayDuration={100}
          variant="ghost"
        >
          <Settings className="size-[18px]" size={18} />
        </ButtonWithTooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("view_options.layout")}
        </DropdownMenuLabel>
        {(Object.keys(iconMap) as LayoutType[]).map((key) => (
          <DropdownMenuItem
            key={key}
            className="cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              handleLayoutChange(key);
            }}
          >
            {createElement(iconMap[key])}
            <span>{t(`layouts.${key}`)}</span>
            {optimisticLayout === key && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}

        {showColumnSlider && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 pb-3 pt-1.5">
              <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>{t("view_options.columns")}</span>
                <span>
                  {isCompactGrid
                    ? COMPACT_GRID_COLUMN_STEPS[tempCompactStepIndex] === 0
                      ? t("view_options.unlimited")
                      : COMPACT_GRID_COLUMN_STEPS[tempCompactStepIndex]
                    : tempColumns}
                </span>
              </div>
              {isCompactGrid ? (
                <Slider
                  value={[tempCompactStepIndex]}
                  onValueChange={([value]) => setTempCompactStepIndex(value)}
                  onValueCommit={([value]) =>
                    updateCompactGridColumns(COMPACT_GRID_COLUMN_STEPS[value])
                  }
                  min={0}
                  max={COMPACT_GRID_COLUMN_STEPS.length - 1}
                  step={1}
                  className="w-full"
                />
              ) : (
                <Slider
                  value={[tempColumns]}
                  onValueChange={([value]) => setTempColumns(value)}
                  onValueCommit={([value]) => updateGridColumns(value)}
                  min={1}
                  max={6}
                  step={1}
                  className="w-full"
                />
              )}
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("view_options.display_options")}
        </DropdownMenuLabel>
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label
            htmlFor="show-notes"
            className="flex flex-1 cursor-pointer items-center gap-2 font-normal leading-normal"
          >
            <NotepadText className="size-4 text-muted-foreground" />
            <span>{t("view_options.show_note_previews")}</span>
          </Label>
          <Switch
            id="show-notes"
            checked={optimisticDisplaySettings.showNotes}
            onCheckedChange={handleShowNotesChange}
          />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label
            htmlFor="show-tags"
            className="flex flex-1 cursor-pointer items-center gap-2 font-normal leading-normal"
          >
            <Tag className="size-4 text-muted-foreground" />
            <span>{t("view_options.show_tags")}</span>
          </Label>
          <Switch
            id="show-tags"
            checked={optimisticDisplaySettings.showTags}
            onCheckedChange={handleShowTagsChange}
          />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label
            htmlFor="show-title"
            className="flex flex-1 cursor-pointer items-center gap-2 font-normal leading-normal"
          >
            <Heading className="size-4 text-muted-foreground" />
            <span>{t("view_options.show_title")}</span>
          </Label>
          <Switch
            id="show-title"
            checked={optimisticDisplaySettings.showTitle}
            onCheckedChange={handleShowTitleChange}
          />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <Label
            htmlFor="show-editor-card"
            className="flex flex-1 cursor-pointer items-center gap-2 font-normal leading-normal"
          >
            <PlusSquare className="size-4 text-muted-foreground" />
            <span>{t("view_options.show_editor_card")}</span>
          </Label>
          <Switch
            id="show-editor-card"
            checked={optimisticDisplaySettings.showEditorCard}
            onCheckedChange={handleShowEditorCardChange}
          />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("view_options.image_options")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            handleImageFitChange("cover");
          }}
        >
          <Image />
          <span>{t("view_options.image_fit_cover")}</span>
          {optimisticImageFit === "cover" && <Check className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            handleImageFitChange("contain");
          }}
        >
          <Image />
          <span>{t("view_options.image_fit_contain")}</span>
          {optimisticImageFit === "contain" && <Check className="ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
