import type { Language } from "@/lib/lang";

// Deterministic, user-facing strings produced server-side WITHOUT a model call —
// the thin-wardrobe note, the generation quota line, and the "nothing coheres"
// gap fallback. Model-produced prose is localized by languageInstruction; these
// bypass the model, so they were always English and must be translated here.
// BLOCK27 voice in every language: certain, brief, unsentimental, no exclamation
// marks, on the user's side against a thin wardrobe. French uses "tu" — direct,
// matching the brand.

// "One analyzed piece isn't an outfit. Add a few more."
const THIN_WARDROBE: Record<Language, string> = {
  en: "One analyzed piece isn't an outfit. Add a few more.",
  fr: "Une seule pièce analysée ne fait pas une tenue. Ajoutes-en quelques-unes.",
  es: "Una sola prenda analizada no es un conjunto. Añade algunas más.",
  pt: "Uma única peça analisada não é um look. Adicione mais algumas.",
  de: "Ein einzelnes analysiertes Teil ist kein Outfit. Füge ein paar mehr hinzu.",
  ar: "قطعة واحدة لا تصنع إطلالة. أضف بضع قطع أخرى.",
  ja: "一着だけではコーディネートになりません。もう数着追加してください。",
  ko: "분석된 한 벌로는 착장이 되지 않습니다. 몇 벌 더 추가하세요.",
};

// "Nothing here holds together yet. Add pieces that pair."
const NOTHING_COHERES: Record<Language, string> = {
  en: "Nothing here holds together yet. Add pieces that pair.",
  fr: "Rien ne s'accorde ici pour l'instant. Ajoute des pièces qui vont ensemble.",
  es: "Aquí todavía nada combina. Añade prendas que peguen entre sí.",
  pt: "Aqui ainda nada combina. Adicione peças que conversem entre si.",
  de: "Hier passt noch nichts zusammen. Füge Teile hinzu, die harmonieren.",
  ar: "لا شيء ينسجم هنا بعد. أضف قطعًا تتناسق معًا.",
  ja: "まだ何もまとまりません。組み合わせられるアイテムを追加してください。",
  ko: "아직 어울리는 조합이 없습니다. 서로 어울리는 아이템을 추가하세요.",
};

// "You've used all {n} generations this cycle." — {n} substituted at call time.
const GENERATIONS_USED: Record<Language, string> = {
  en: "You've used all {n} generations this cycle.",
  fr: "Tu as utilisé tes {n} générations de ce cycle.",
  es: "Has usado tus {n} generaciones de este ciclo.",
  pt: "Você usou as suas {n} gerações deste ciclo.",
  de: "Du hast alle {n} Generierungen dieses Zyklus verbraucht.",
  ar: "لقد استخدمت كل الـ{n} عمليات توليد في هذه الدورة.",
  ja: "今サイクルの{n}回の生成をすべて使いました。",
  ko: "이번 주기의 생성 {n}회를 모두 사용했습니다.",
};

// " Upgrade for more." — appended (with a leading space) when checkout is open.
const UPGRADE_FOR_MORE: Record<Language, string> = {
  en: " Upgrade for more.",
  fr: " Passe à l'offre supérieure pour plus.",
  es: " Mejora tu plan para más.",
  pt: " Faça upgrade para mais.",
  de: " Upgrade für mehr.",
  ar: " ارتقِ بخطتك للمزيد.",
  ja: " さらに使うにはアップグレードを。",
  ko: " 더 사용하려면 업그레이드하세요.",
};

export function thinWardrobeGap(lang: Language): string {
  return THIN_WARDROBE[lang] ?? THIN_WARDROBE.en;
}

export function nothingCoheresGap(lang: Language): string {
  return NOTHING_COHERES[lang] ?? NOTHING_COHERES.en;
}

export function generationsUsed(lang: Language, n: number, upgrade: boolean): string {
  const base = (GENERATIONS_USED[lang] ?? GENERATIONS_USED.en).replace("{n}", String(n));
  return upgrade ? base + (UPGRADE_FOR_MORE[lang] ?? UPGRADE_FOR_MORE.en) : base;
}
