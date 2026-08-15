import { AuthForm } from "@/components/AuthForm";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <AuthForm
      action={login}
      submitLabel="Enter"
      altPrompt="No account yet."
      altHref="/signup"
      altLabel="Create one."
      error={error}
      notice={notice}
      showForgot
    />
  );
}
