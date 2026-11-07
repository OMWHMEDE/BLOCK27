import { WeekStory } from "@/components/landing/WeekStory";

// The landing. Its one job is sending people to the app: a four-scene scroll
// story (1600 → today → the latest update: BLOCK27 → the button), then the
// legal links the stores require. No prices here: they're shown in the app.
//
// Set NEXT_PUBLIC_APP_STORE_URL in Vercel the day the app is live: the
// waitlist form becomes the "Download free" button. Unset = pre-launch.
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || null;

export default function LandingPage() {
  return <WeekStory appStoreUrl={APP_STORE_URL} />;
}
