"use client";

import { useId, useState, useTransition } from "react";
import { notifyLaunch, type NotifyResult } from "@/app/waitlist/actions";
import { sourceFromSearch } from "@/lib/waitlist";

// The landing CTA while the product is iOS-only: capture an email for launch
// notification into the waitlist table, confirm inline without leaving the page.
// Swapped for the App Store link once the app is live. Brand voice: cold, brief,
// no exclamation marks. border-radius 0, paper on void.
//
// The marketing source is read from the URL client-side (so the landing stays
// static) and passed to the server action; it is re-normalized server-side.
//
// hideLabel drops the visible "Get notified at launch" heading (kept for screen
// readers) where the surrounding copy already says what the field is — e.g. the
// single-screen landing.
export function NotifyLaunch({
  className = "",
  hideLabel = false,
}: {
  className?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<NotifyResult>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  if (result.status === "ok") {
    return (
      <p className={`landing-notify landing-notify--done ${className}`}>
        You&rsquo;re on the list. We email you once, when it launches.
      </p>
    );
  }

  return (
    <form
      className={`landing-notify ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        // Read the marketing source from the URL at submit time (the landing
        // stays static); it is re-normalized server-side regardless.
        const source = sourceFromSearch(window.location.search);
        startTransition(async () => {
          setResult(await notifyLaunch(email, source));
        });
      }}
    >
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "landing-notify__label"}
      >
        Get notified at launch
      </label>
      <div className="landing-notify__row">
        <input
          id={id}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (result.status === "error") setResult({ status: "idle" });
          }}
          className="landing-notify__input"
          aria-invalid={result.status === "error"}
        />
        <button type="submit" className="landing-cta" disabled={pending}>
          {pending ? "SENDING" : "NOTIFY ME"}
        </button>
      </div>
      {result.status === "error" ? (
        <p className="landing-notify__error" role="alert">
          {result.message}
        </p>
      ) : (
        <p className="landing-notify__consent">One email, when it launches.</p>
      )}
    </form>
  );
}
