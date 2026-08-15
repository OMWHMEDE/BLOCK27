import Link from "next/link";
import { btnPrimary } from "@/lib/ui";

// The house "27" field, scoped to the auth screens (login/signup) only — every
// other surface stays pure --void. PROMINENT, not the faint tile ground: a
// repeating tiled "27" at a clearly-visible ash so the door to the app carries
// the mark. A tiled background (not fixed-count text) so it fills the FULL
// scrollable height however tall the form grows. ash #8A8783 at 0.5.
const FIELD_27 =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='19'%3E%3Ctext x='0' y='14' font-family='monospace' font-size='12' letter-spacing='0.08em' fill='%238A8783' fill-opacity='0.5'%3E27%3C/text%3E%3C/svg%3E\")";

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
  showForgot = false,
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
  // Login only: the "Forgot password?" affordance under the password field.
  showForgot?: boolean;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      {/* Full-bleed 27 field behind the form. isolate keeps it in this screen's
          stacking context; -z-10 holds it behind the content. It arrives on the
          brand's loading motion (the same "the field of 27s fades in" beat as the
          loader) and is static under prefers-reduced-motion — .loader-in already
          honours that. */}
      <div
        aria-hidden
        className="loader-in pointer-events-none absolute inset-0 -z-10 select-none"
        style={{ backgroundImage: FIELD_27 }}
      />

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
                className="bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
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
              className="bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
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
              className="bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
            />
          </label>

          {showForgot ? (
            <Link
              href="/reset"
              className="-mt-3 self-end text-xs uppercase tracking-[0.08em] text-ash hover:text-bone"
            >
              Forgot password?
            </Link>
          ) : null}

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
    </div>
  );
}
