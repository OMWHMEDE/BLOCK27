import { AuthForm } from "@/components/AuthForm";
import { signup } from "../login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthForm
      action={signup}
      submitLabel="Create account"
      altPrompt="Already have an account?"
      altHref="/login"
      altLabel="Log in"
      error={error}
    />
  );
}
