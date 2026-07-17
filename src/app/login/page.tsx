import { AuthForm } from "@/components/AuthForm";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthForm
      action={login}
      submitLabel="Enter"
      altPrompt="No account?"
      altHref="/signup"
      altLabel="Create one"
      error={error}
    />
  );
}
