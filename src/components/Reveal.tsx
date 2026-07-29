"use client";

import { useEffect, useRef, useState } from "react";

// One orchestrated scroll reveal per section. Wraps its children and fades them
// up on the house easing curve the first time they enter the viewport, then
// stops observing. The hidden start state lives in CSS (.reveal-on-scroll), so
// reduced motion is respected there; this only flips the in-view flag. A section
// already in view on load (the hero) reveals immediately.
export function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${inView ? "is-in" : ""} ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
