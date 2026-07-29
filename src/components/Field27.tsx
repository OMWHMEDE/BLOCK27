// A repeating field of "27", small and mono in faint --ash over --void — the
// app's house loading/locked language (the same field a tile shows before its
// image fades in, and the full 27 loading screen). Purely decorative ground:
// aria-hidden, non-interactive. It fills its positioned parent — enough repeats
// to cover a tall locked tile, clipped harmlessly on a small one (the parent is
// overflow-hidden).
const FIELD = "27 ".repeat(500).trim();

export function Field27() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none break-words p-1 font-mono text-[10px] leading-[1.5] tracking-[0.08em] text-ash/20"
    >
      {FIELD}
    </div>
  );
}
