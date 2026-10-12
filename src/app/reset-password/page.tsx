import { ResetPasswordClient } from "./ResetPasswordClient";

// Password reset landing for the mobile app. Supabase sends its recovery emails
// here (block27.app/reset-password); the link carries a recovery session which is
// read client-side, so the work lives in ResetPasswordClient. Kept reachable even
// while the rest of the site is just a landing page (see the shopfront allowlist
// in lib/supabase/middleware).
export const metadata = { title: "BLOCK27 — Reset password" };

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
