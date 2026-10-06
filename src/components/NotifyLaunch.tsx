"use client";

import { useId, useState, useTransition } from "react";
import { notifyLaunch, type NotifyResult } from "@/app/waitlist/actions";

// The landing CTA while the product is iOS-only: capture an email for launch
// notification into the waitlist table, confirm inline without leaving the page.
// Swapped for the App Store link once the app is live. Brand voice: cold, brief,
// no exclamation marks. border-radius 0, paper on void.
export function NotifyLaunch({ className = "" }: { className?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<NotifyResult>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  if (result.status === "ok") {
    return (
      <p className={`landing-notify landing-notify--done ${className}`}>
        You&rsquo;re on the list. We&rsquo;ll email you when it lands.
      </p>
    );
  }

  return (
    <form
      className={`landing-notify ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        startTransition(async () => {
          setResult(await notifyLaunch(email));
        });
      }}
    >
      <label htmlFor={id} className="landing-notify__label">
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
      ) : null}
    </form>
  );
}
