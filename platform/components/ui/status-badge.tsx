"use client";

import { Badge } from "./badge";
import { cn } from "@/lib/utils";

type StatusType = "draft" | "active" | "error" | "none" | "running" | "done";

interface StatusBadgeProps {
  status: StatusType;
}

const statusConfig: Record<StatusType, { variant: "default" | "success" | "warning" | "error" | "info"; label: string; pulse?: boolean }> = {
  draft: { variant: "default", label: "초안" },
  active: { variant: "success", label: "활성" },
  error: { variant: "error", label: "오류" },
  none: { variant: "default", label: "미설정" },
  running: { variant: "warning", label: "진행중", pulse: true },
  done: { variant: "success", label: "완료" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.pulse && "animate-pulse")}
    >
      {config.label}
    </Badge>
  );
}
