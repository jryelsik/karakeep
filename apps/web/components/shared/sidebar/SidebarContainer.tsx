"use client";

import { useSidebarCollapsed } from "@/lib/userLocalSettings/bookmarksLayout";
import { cn } from "@/lib/utils";

export default function SidebarContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const collapsed = useSidebarCollapsed();
  return (
    <aside
      className={cn(
        "flex h-[calc(100vh-64px)] flex-col gap-5",
        collapsed
          ? "w-14 items-center px-2 py-4 [&_h2]:hidden"
          : "w-60 p-4 xl:w-72",
        className,
      )}
    >
      {children}
    </aside>
  );
}
