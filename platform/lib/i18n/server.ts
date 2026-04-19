import { cookies } from "next/headers";
import { translations, defaultLocale, LANG_COOKIE, type Locale } from "./index";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get(LANG_COOKIE)?.value;
  return (val === "en" || val === "ko" ? val : defaultLocale) as Locale;
}

export async function getServerT() {
  const lang = await getServerLocale();
  return translations[lang];
}
