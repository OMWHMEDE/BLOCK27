// A small, quiet avatar. Square (like everything), an iron hairline frame, and a
// plain --iron block when there's no image — the default for accounts that never
// set one. Kept small so the wordmark stays the hero.
export function Avatar({
  url,
  size = 32,
}: {
  url: string | null;
  size?: number;
}) {
  return (
    <span
      className="block shrink-0 overflow-hidden border border-iron bg-iron"
      style={{ width: size, height: size }}
    >
      {url ? (
        // Private object via a short-lived signed URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}
