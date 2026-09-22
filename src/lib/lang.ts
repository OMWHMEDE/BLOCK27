import type { SupabaseClient } from "@supabase/supabase-js";

// The AI-output language preference. Stored on users.language, read into every
// brain call so the model answers in the user's language. Plain module (no
// server-only) so a settings UI can import the constants too.

export type Language =
  | "en"
  | "fr"
  | "ar"
  | "es"
  | "pt"
  | "de"
  | "ja"
  | "ko";

export const LANGUAGES: Language[] = [
  "en",
  "fr",
  "ar",
  "es",
  "pt",
  "de",
  "ja",
  "ko",
];
export const DEFAULT_LANGUAGE: Language = "en";

export function isLanguage(v: unknown): v is Language {
  return typeof v === "string" && (LANGUAGES as string[]).includes(v);
}

// Normalize any stored/incoming value to a valid language, defaulting to English.
export function toLanguage(v: unknown): Language {
  return isLanguage(v) ? v : DEFAULT_LANGUAGE;
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  fr: "French",
  ar: "Arabic",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
};

// Appended to a brain's system prompt so the model answers in the user's
// language. ALWAYS emitted, English included: the prompts are English, but the
// stored garment analyses fed back in as text may be in another language (the
// user changed their preference, or older records were written under a different
// one), and without an explicit instruction the model mirrors that language. So
// pin the output language every time. It directs the model to write user-facing
// PROSE in the chosen language while keeping MACHINE values in English, so
// downstream code — the enum maps, the render layer order, the retail search —
// keeps working unchanged.
export function languageInstruction(language: Language): string {
  const name = LANGUAGE_NAMES[language];
  return `

LANGUAGE:
Write every human-readable, user-facing string in ${name}, regardless of the language of any text provided to you: descriptors, reads, summaries, reasoning, gaps, advice, and the "why" behind each pick. Keep MACHINE values in English exactly as the schema specifies and never translate them — the enum fields (category, accessory_type, length) and any retail search query. Translate the prose, not the machine values.`;
}

// The user's stored language preference, defaulting to English. Read through the
// caller's user-scoped client, so RLS scopes it to that user.
export async function getUserLanguage(
  supabase: SupabaseClient,
  userId: string,
): Promise<Language> {
  const { data } = await supabase
    .from("users")
    .select("language")
    .eq("id", userId)
    .maybeSingle();
  return toLanguage(data?.language);
}
