import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  asChild?: boolean;
};

const bianti = {
  default: "bg-foreground text-background hover:bg-foreground/90",
  ghost: "hover:bg-muted hover:text-foreground",
  outline: "border border-border bg-transparent hover:bg-muted",
};

const chicun = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  icon: "size-10",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<{ className?: string }>;

    return React.cloneElement(child, {
      className: cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        bianti[variant],
        chicun[size],
        child.props.className,
        className,
      ),
    });
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        bianti[variant],
        chicun[size],
        className,
      )}
      {...props}
    />
  );
}
