import Link from "next/link";

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
}: {
  action: (formData: FormData) => void;
  submitLabel: string;
  altPrompt: string;
  altHref: string;
  altLabel: string;
  error?: string;
  notice?: string;
}) {
  return (
    <main className="flex flex-1 flex-col justify-center px-8 py-24 max-w-sm w-full mx-auto">
      <h1 className="text-2xl tracking-tight mb-1">BLOCK27</h1>
      <p className="text-paper/50 text-sm mb-12">You wear good clothes wrong.</p>

      {notice ? (
        <p className="text-paper/70 text-sm border border-paper/30 px-3 py-2 mb-6">
          {notice}
        </p>
      ) : null}

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-paper/50">
            Email
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="bg-transparent border border-paper/30 px-3 py-2 text-paper outline-none focus:border-paper"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-paper/50">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="bg-transparent border border-paper/30 px-3 py-2 text-paper outline-none focus:border-paper"
          />
        </label>

        {error ? (
          <p className="text-blood text-sm border border-blood px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="bg-paper text-void py-2 mt-2 uppercase tracking-wide text-sm hover:bg-paper/90"
        >
          {submitLabel}
        </button>
      </form>

      <p className="text-paper/50 text-sm mt-8">
        {altPrompt}{" "}
        <Link href={altHref} className="text-paper underline">
          {altLabel}
        </Link>
      </p>
    </main>
  );
}
