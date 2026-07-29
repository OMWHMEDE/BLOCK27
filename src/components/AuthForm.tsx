import Link from "next/link";
import { btnPrimary } from "@/lib/ui";

// Shared login/signup form. Server component: the form posts straight to a
// server action, no client JS required.
export function AuthForm({
  action,
  submitLabel,
  altPrompt,
  altHref,
  altLabel,
  error,
  notice,
  profileFields = false,
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  altPrompt: string;
  altHref: string;
  altLabel: string;
  error?: string;
  notice?: string;
  // Signup only: an optional display name and avatar, captured up front.
  profileFields?: boolean;
}) {
  return (
    <main className="flex flex-1 flex-col justify-center px-8 py-24 max-w-sm w-full mx-auto">
      <h1 className="text-5xl font-black uppercase tracking-[-0.03em] leading-[0.85]">
        BLOCK27
      </h1>
      <p className="text-ash mt-4 mb-16">You wear good clothes wrong.</p>

      {notice ? (
        <p className="text-bone text-sm border border-iron px-3 py-3 mb-6">
          {notice}
        </p>
      ) : null}

      <form action={action} className="flex flex-col gap-5">
        {profileFields ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.08em] text-ash">
              Name — optional
            </span>
            <input
              type="text"
              name="display_name"
              autoComplete="name"
              maxLength={40}
              className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-ash">
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-ash">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
          />
        </label>

        {profileFields ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.08em] text-ash">
              Profile picture — optional
            </span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="text-ash text-sm file:mr-3 file:border-0 file:bg-paper file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.08em] file:text-void file:cursor-pointer hover:file:bg-bone"
            />
          </label>
        ) : null}

        {error ? (
          <p className="text-blood text-sm border border-blood px-3 py-2">
            {error}
          </p>
        ) : null}

        <button type="submit" className={`${btnPrimary} w-full mt-2`}>
          {submitLabel}
        </button>
      </form>

      <p className="text-ash text-sm mt-10">
        {altPrompt}{" "}
        <Link href={altHref} className="text-paper hover:text-bone underline underline-offset-4">
          {altLabel}
        </Link>
      </p>
    </main>
  );
}
