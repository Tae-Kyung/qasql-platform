"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  className?: string;
}

export function Card({ title, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-6",
        className
      )}
      {...props}
    >
      {title && (
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
