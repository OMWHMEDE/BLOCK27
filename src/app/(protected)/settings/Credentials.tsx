"use client";

import { useState, useTransition } from "react";
import { btnPrimary } from "@/lib/ui";
import { updateEmail, updatePassword } from "./actions";

type Result = { ok: boolean; error?: string; notice?: string };

function CredentialForm({
  label,
  name,
  type,
  autoComplete,
  defaultValue,
  minLength,
  submitLabel,
  action,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  minLength?: number;
  submitLabel: string;
  action: (formData: FormData) => Promise<Result>;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const res = await action(fd);
      setMsg({
        ok: res.ok,
        text: res.ok ? res.notice ?? "Done." : res.error ?? "Failed.",
      });
      if (res.ok) e.currentTarget?.reset?.();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-[0.08em] text-ash">
          {label}
        </span>
        <input
          type={type}
          name={name}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          minLength={minLength}
          className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`${btnPrimary} self-start`}
      >
        {pending ? "Saving." : submitLabel}
      </button>
      {msg ? (
        <p className={`text-sm ${msg.ok ? "text-ash" : "text-blood"}`}>
          {msg.text}
        </p>
      ) : null}
    </form>
  );
}

export function ChangeEmail({ current }: { current: string }) {
  return (
    <CredentialForm
      label="Email"
      name="email"
      type="email"
      autoComplete="email"
      defaultValue={current}
      submitLabel="Change email"
      action={updateEmail}
    />
  );
}

export function ChangePassword() {
  return (
    <CredentialForm
      label="New password"
      name="password"
      type="password"
      autoComplete="new-password"
      minLength={8}
      submitLabel="Change password"
      action={updatePassword}
    />
  );
}
