"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { btnPrimary } from "@/lib/ui";

// Password reset for the mobile app. Supabase's recovery email points here; the
// link lands with a recovery session in the URL hash (the default verify-redirect
// flow). We read it, let the user set a new password with supabase.auth.updateUser,
// and send them back to the app to sign in. An expired/invalid link gets a plain
// message and an inline way to request a fresh one.
//
// Everything is client-side: the hash fragment is never sent to the server, so
// the recovery session only ever exists in this tab. The client is created lazily
// and only in the browser (never during server render), with detectSessionInUrl
// off (we parse the hash ourselves, deterministically) and persistSession off
// (the recovery token stays in memory, never written to storage or cookies, and
// is gone when the tab closes).

type Client = ReturnType<typeof createBrowserClient>;

let client: Client | null = null;
// Browser-only: only ever called from effects / event handlers, so it never runs
// during prerender (where the public env isn't inlined).
function getClient(): Client {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          detectSessionInUrl: false,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return client;
}

type Phase = "checking" | "ready" | "done" | "invalid";

const INPUT =
  "bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper";
const LABEL = "text-xs uppercase tracking-[0.08em] text-ash";

export function ResetPasswordClient() {
  const [phase, setPhase] = useState<Phase>("checking");

  // Read the recovery session off the link once, on mount.
  useEffect(() => {
    let alive = true;
    const supabase = getClient();

    const stripFromUrl = () => {
      // Don't leave the access token sitting in the address bar / history.
      window.history.replaceState(null, "", window.location.pathname);
    };

    void (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      // Supabase puts an expired/invalid/used link's reason in the hash.
      if (hash.get("error") || hash.get("error_code") || hash.get("error_description")) {
        stripFromUrl();
        if (alive) setPhase("invalid");
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        stripFromUrl();
        if (alive) setPhase(error ? "invalid" : "ready");
        return;
      }

      // Best-effort fallback for a ?code= style link (same-browser only).
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        stripFromUrl();
        if (alive) setPhase(error ? "invalid" : "ready");
        return;
      }

      if (alive) setPhase("invalid");
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col justify-center px-8 py-24 max-w-sm w-full mx-auto bg-void">
      <h1 className="text-5xl font-black uppercase tracking-[-0.03em] leading-[0.85]">
        BLOCK27
      </h1>

      {phase === "checking" ? (
        <p className="text-ash mt-4" aria-live="polite">
          Checking your link&hellip;
        </p>
      ) : phase === "done" ? (
        <Done />
      ) : phase === "invalid" ? (
        <Invalid />
      ) : (
        <SetPassword
          onDone={() => setPhase("done")}
          onExpired={() => setPhase("invalid")}
        />
      )}
    </main>
  );
}

function SetPassword({
  onDone,
  onExpired,
}: {
  onDone: () => void;
  onExpired: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those don't match.");
      return;
    }

    setBusy(true);
    setError(null);
    const { error: updErr } = await getClient().auth.updateUser({ password });
    if (updErr) {
      setBusy(false);
      // No live recovery session → the link lapsed mid-flow. Send them to the
      // request-a-new-link state rather than a dead-end error.
      const msg = updErr.message.toLowerCase();
      if (msg.includes("session") || msg.includes("expired") || updErr.status === 401) {
        onExpired();
        return;
      }
      setError(updErr.message || "That didn't work. Try again.");
      return;
    }
    // Drop the recovery session from memory now that it's spent.
    await getClient().auth.signOut().catch(() => {});
    onDone();
  }

  return (
    <>
      <p className="text-ash mt-4 mb-16">Set a new password.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>New password</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Confirm password</span>
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            className={INPUT}
          />
        </label>

        {error ? (
          <p className="text-blood text-sm border border-blood px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={`${btnPrimary} w-full mt-2`}>
          {busy ? "Setting…" : "Set password"}
        </button>
      </form>
    </>
  );
}

function Done() {
  return (
    <>
      <p className="text-paper mt-4 mb-8 text-lg leading-snug" aria-live="polite">
        Your password is set.
      </p>
      <p className="text-bone text-sm border border-iron px-3 py-3 leading-snug">
        Return to the BLOCK27 app and sign in with your new password.
      </p>
    </>
  );
}

function Invalid() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const email = String(new FormData(e.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That's not an email.");
      return;
    }
    setBusy(true);
    setError(null);
    // Neutral either way — never reveal whether an account exists.
    await getClient()
      .auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      .catch(() => {});
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <p className="text-ash mt-4 mb-8" aria-live="polite">
          Check your inbox.
        </p>
        <p className="text-bone text-sm border border-iron px-3 py-3 leading-snug">
          If an account exists for that email, a new reset link is on its way. The
          link expires &mdash; use it soon.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-ash mt-4 mb-4">This link has expired or already been used.</p>
      <p className="text-bone text-sm mb-12 leading-snug">
        Enter your email and we&rsquo;ll send a fresh one.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className={INPUT}
          />
        </label>

        {error ? (
          <p className="text-blood text-sm border border-blood px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className={`${btnPrimary} w-full mt-2`}>
          {busy ? "Sending…" : "Send a new link"}
        </button>
      </form>
    </>
  );
}
