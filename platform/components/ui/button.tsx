"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
}

const variantClasses = {
  default: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
  outline: "bg-transparent text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600",
  ghost: "bg-transparent text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 border border-transparent",
  destructive: "bg-red-600 text-white hover:bg-red-700 border border-red-600",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "default",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
