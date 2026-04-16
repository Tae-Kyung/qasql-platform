"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaskTextProps {
  text: string;
  className?: string;
}

export function MaskText({ text, className }: MaskTextProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="font-mono text-sm">
        {visible ? text : "****"}
      </span>
      <button
        onClick={() => setVisible(!visible)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title={visible ? "숨기기" : "보기"}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </span>
  );
}
