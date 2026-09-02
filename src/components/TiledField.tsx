// The house "27" laid as a faint, repeating field behind a whole screen — the
// same motif as the login door, dialed far down (fill-opacity 0.16, not the
// login's 0.5) so it reads as texture under body copy without fighting it. Drop
// it into a `relative isolate` container; it fills that container's full
// scrollable height and sits behind the content on -z-10. Static and decorative
// (aria-hidden) — it never intercepts a tap.
const FIELD_27 =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='21'%3E%3Ctext x='0' y='15' font-family='monospace' font-size='12' letter-spacing='0.08em' fill='%238A8783' fill-opacity='0.16'%3E27%3C/text%3E%3C/svg%3E\")";

export function TiledField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 select-none"
      style={{ backgroundImage: FIELD_27 }}
    />
  );
}
