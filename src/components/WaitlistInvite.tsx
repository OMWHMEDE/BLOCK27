"use client";

import { useState, useTransition } from "react";
import { notifyLaunch, type NotifyResult } from "@/app/waitlist/actions";
import { sourceFromSearch } from "@/lib/waitlist";

// The landing's email capture, styled to the original invite form (centred
// underline input, paper "Request invite" button). It keeps the launch wiring:
// the marketing source is read from the URL client-side (so the landing stays
// static) and passed to notifyLaunch, which records consent + source and sends
// the confirmation email. Success confirms inline — no navigation.
export function WaitlistInvite() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<NotifyResult>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  if (result.status === "ok") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <p className="text-lg font-bold uppercase tracking-tight text-paper">
          You&rsquo;re on the list.
        </p>
        <p className="text-sm text-ash">We email you once, when it launches.</p>
      </div>
    );
  }

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        // Read the marketing source from the URL at submit time; the landing
        // stays static and it is re-normalized server-side.
        const source = sourceFromSearch(window.location.search);
        startTransition(async () => {
          setResult(await notifyLaunch(email, source));
        });
      }}
    >
      {result.status === "error" ? (
        <p
          role="alert"
          className="border border-blood px-3 py-2 text-sm text-blood"
        >
          {result.message}
        </p>
      ) : null}

      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@email.com"
        aria-label="Email address"
        aria-invalid={result.status === "error"}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (result.status === "error") setResult({ status: "idle" });
        }}
        className="border-b border-iron bg-transparent py-3 text-center tracking-wide text-paper outline-none placeholder:text-ash focus:border-paper"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-paper py-4 text-sm uppercase tracking-[0.15em] text-void hover:bg-bone disabled:opacity-50"
      >
        {pending ? "Sending" : "Request invite"}
      </button>
      <p className="text-center font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
        One email, when it launches.
      </p>
    </form>
  );
}
