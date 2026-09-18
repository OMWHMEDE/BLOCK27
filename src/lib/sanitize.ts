// Model output occasionally leaks markup into free-text fields: stray HTML/XML
// tags, or fragments of the assistant's own tool-call syntax (e.g. antml
// parameter tags). None of it is human-readable, and these strings are shown to
// users, so strip every tag-like sequence before any of it is stored or
// displayed. Shared by every place that reads free text back from a model.
export function stripMarkup(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ") // well-formed tags: <tag ...>, </tag>, <tag/>
    .replace(/<[^>]*$/g, " ") // a truncated / unclosed final tag
    .replace(/&[a-z]+;/gi, " ") // stray HTML entities
    .replace(/\s+/g, " ")
    .trim();
}

export function stripMarkupList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(stripMarkup).filter((s) => s.length > 0);
}
