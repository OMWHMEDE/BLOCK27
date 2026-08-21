"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { saveProfile } from "./actions";
import { ERR_GENERIC } from "@/lib/support";

export function EditProfile({
  displayName,
  avatarUrl,
}: {
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const res = await saveProfile(fd);
      setMsg({
        ok: res.ok,
        text: res.ok ? res.notice ?? "Saved." : res.error ?? ERR_GENERIC,
      });
      if (res.ok) {
        setPreview(null);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {preview ? (
          <span className="block w-16 h-16 shrink-0 overflow-hidden border border-iron">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <Avatar url={avatarUrl} size={64} />
        )}
        <label className={`${btnSecondary} cursor-pointer`}>
          Choose image
          <input
            type="file"
            name="avatar"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-[0.08em] text-ash">
          Display name
        </span>
        <input
          type="text"
          name="display_name"
          defaultValue={displayName ?? ""}
          maxLength={40}
          className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className={`${btnPrimary} self-start`}
      >
        {pending ? "Saving." : "Save"}
      </button>

      {msg ? (
        <p className={`text-sm ${msg.ok ? "text-ash" : "text-blood"}`}>
          {msg.text}
        </p>
      ) : null}
    </form>
  );
}
