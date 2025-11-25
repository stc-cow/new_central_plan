import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DeviceFrameProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function DeviceFrame({ title, children, className }: DeviceFrameProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {title ? (
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>
      ) : null}
      <div
        className={cn(
          "relative w-full max-w-[380px] rounded-[2.5rem] border border-border bg-background p-5 shadow-xl",
          "before:absolute before:inset-x-16 before:top-2 before:h-1 before:rounded-full before:bg-muted",
          "after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-16 after:-translate-x-1/2 after:rounded-full after:bg-muted",
          className,
        )}
      >
        <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-inner">
          <div className="h-[640px] overflow-y-auto bg-muted/20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
