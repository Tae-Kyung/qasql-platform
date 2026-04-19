"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { translations, defaultLocale, LANG_COOKIE, type Locale, type Translations } from "./index";

interface LanguageContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${LANG_COOKIE}=`))
      ?.split("=")[1] as Locale | undefined;
    if (stored && (stored === "en" || stored === "ko")) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((lang: Locale) => {
    setLocaleState(lang);
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000`;
  }, []);

  return (
    <LanguageContext.Provider
      value={{ locale, t: translations[locale], setLocale }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
