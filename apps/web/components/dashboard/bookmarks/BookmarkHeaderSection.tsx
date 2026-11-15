"use client";

import { Separator } from "@/components/ui/separator";
import { useBookmarkDisplaySettings } from "@/lib/userLocalSettings/bookmarksLayout";

export default function BookmarkHeaderSection({
  header,
  showDivider,
}: {
  header?: React.ReactNode;
  showDivider?: boolean;
}) {
  const { showListHeader } = useBookmarkDisplaySettings();
  if (!showListHeader || (!header && !showDivider)) {
    return null;
  }
  return (
    <>
      {header}
      {showDivider && <Separator />}
    </>
  );
}
