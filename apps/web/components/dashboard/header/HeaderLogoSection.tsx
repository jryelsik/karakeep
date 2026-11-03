"use client";

import { useTransition } from "react";
import Link from "next/link";
import KarakeepLogo from "@/components/KarakeepIcon";
import { Button } from "@/components/ui/button";
import { useSidebarCollapsed } from "@/lib/userLocalSettings/bookmarksLayout";
import { updateSidebarCollapsed } from "@/lib/userLocalSettings/userLocalSettings";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function HeaderLogoSection() {
  const collapsed = useSidebarCollapsed();
  const [, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "hidden items-center justify-between pr-2 sm:flex",
        collapsed ? "w-auto gap-1" : "w-56 xl:w-[17rem]",
      )}
    >
      <Link
        href="/dashboard/bookmarks"
        className={cn("flex items-center", collapsed && "w-8 justify-center")}
      >
        <KarakeepLogo height={collapsed ? 26 : 38} iconOnly={collapsed} />
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-foreground"
        onClick={() =>
          startTransition(() => updateSidebarCollapsed(!collapsed))
        }
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </Button>
    </div>
  );
}
