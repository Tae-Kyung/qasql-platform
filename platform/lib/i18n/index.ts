import { en } from "./translations/en";
import { ko } from "./translations/ko";

export type Locale = "en" | "ko";
export type { Translations } from "./translations/en";

export const translations: Record<Locale, typeof en> = { en, ko };

export const defaultLocale: Locale = "ko";
export const LANG_COOKIE = "qasql-lang";
