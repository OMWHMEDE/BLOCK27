// Shared button styles — one language across the whole app. Square, cold, and
// unmistakably pressable: every button has a visible edge or fill and a clear
// rest -> hover -> press response. Compose with layout utilities at the call
// site, e.g. `${btnPrimary} w-full` or `${btnNav} shrink-0`.

// `transition` (not just colors) + a short duration so the press reads
// immediately, and `active:scale-[0.96]` so a tap physically compresses the
// button. Every variant also shifts colour on press (below). transform-gpu
// keeps the scale crisp.
const BTN_BASE =
  "inline-flex items-center justify-center uppercase tracking-[0.08em] transition transform-gpu duration-100 ease-out active:scale-[0.96] motion-reduce:active:scale-100 disabled:opacity-50 disabled:pointer-events-none";

// Primary: paper fill. The one main action on a screen.
export const btnPrimary = `${BTN_BASE} px-6 py-3 text-sm bg-paper text-void hover:bg-bone active:bg-ash`;

// Secondary: iron outline. The alternate action.
export const btnSecondary = `${BTN_BASE} px-6 py-3 text-sm border border-iron text-bone hover:border-paper hover:text-paper active:bg-iron`;

// Nav / utility: small bordered chip for header links and inline controls.
export const btnNav = `${BTN_BASE} px-3 py-1.5 text-xs border border-iron text-ash hover:border-paper hover:text-paper active:bg-iron`;

// Danger: blood fill. A destructive, irreversible action only.
export const btnDanger = `${BTN_BASE} px-6 py-3 text-sm bg-blood text-paper hover:opacity-90 active:opacity-80`;
