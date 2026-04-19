"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

const variantClasses = {
  default: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200",
  success: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
  warning: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400",
  error: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
  info: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
