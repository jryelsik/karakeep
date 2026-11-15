"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const [contentNode, setContentNode] = React.useState<HTMLDivElement | null>(
    null,
  );

  React.useEffect(() => {
    if (!contentNode) return;
    // Stop wheel/touchmove before reaching document-level react-remove-scroll listeners inside Dialogs.
    const stopPropagation = (e: Event) => e.stopPropagation();
    contentNode.addEventListener("wheel", stopPropagation, { passive: true });
    contentNode.addEventListener("touchmove", stopPropagation, {
      passive: true,
    });
    return () => {
      contentNode.removeEventListener("wheel", stopPropagation);
      contentNode.removeEventListener("touchmove", stopPropagation);
    };
  }, [contentNode]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      setContentNode(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={setRefs}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-[--radix-popover-content-transform-origin] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
