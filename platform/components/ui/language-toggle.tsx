"use client";

import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
      className={cn(
        "px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 transition-colors",
        className
      )}
      aria-label="Toggle language"
    >
      {locale === "ko" ? "EN" : "한"}
    </button>
  );
}
