// The branded loading screen. Void black, one dominant paper "27" that breathes,
// and a field of dim "27"s scattered behind it. Everything fades in — no hard
// cut to a plain black screen. Purely presentational and deterministic (fixed
// positions, no random), so it renders the same on the server (route loading.tsx)
// and inside a client component during an upload.

// Fixed scatter — spread across the whole screen, varied size and tilt, each
// fading in on its own beat. text-ash at low opacity sits it behind the big one.
const SCATTER: {
  left: string;
  top: string;
  size: string;
  rot: number;
  delay: string;
}[] = [
  { left: "6%", top: "10%", size: "3rem", rot: -12, delay: "0.05s" },
  { left: "78%", top: "7%", size: "4rem", rot: 8, delay: "0.12s" },
  { left: "40%", top: "4%", size: "2.2rem", rot: -6, delay: "0.18s" },
  { left: "20%", top: "28%", size: "5rem", rot: 10, delay: "0.1s" },
  { left: "88%", top: "26%", size: "2.6rem", rot: -14, delay: "0.22s" },
  { left: "58%", top: "18%", size: "3.4rem", rot: 6, delay: "0.16s" },
  { left: "3%", top: "46%", size: "3rem", rot: 12, delay: "0.24s" },
  { left: "90%", top: "50%", size: "4.2rem", rot: -8, delay: "0.14s" },
  { left: "31%", top: "56%", size: "2.4rem", rot: -10, delay: "0.26s" },
  { left: "70%", top: "62%", size: "3.6rem", rot: 9, delay: "0.18s" },
  { left: "13%", top: "70%", size: "4rem", rot: -6, delay: "0.2s" },
  { left: "49%", top: "78%", size: "2.8rem", rot: 7, delay: "0.25s" },
  { left: "84%", top: "80%", size: "3.2rem", rot: -12, delay: "0.15s" },
  { left: "25%", top: "88%", size: "4.6rem", rot: 10, delay: "0.28s" },
  { left: "62%", top: "92%", size: "2.4rem", rot: -8, delay: "0.2s" },
  { left: "5%", top: "88%", size: "3rem", rot: 8, delay: "0.3s" },
];

export function LoadingScreen() {
  return (
    <div className="loader-in fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-void">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SCATTER.map((s, i) => (
          <span
            key={i}
            className="loader-bit absolute select-none font-black leading-none text-ash/15"
            style={{
              left: s.left,
              top: s.top,
              fontSize: s.size,
              transform: `rotate(${s.rot}deg)`,
              animationDelay: s.delay,
            }}
          >
            27
          </span>
        ))}
      </div>

      <span className="breathe-soft relative z-10 select-none font-black leading-none tracking-tight text-paper text-[clamp(8rem,32vw,22rem)]">
        27
      </span>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
