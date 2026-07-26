import { LoadingScreen } from "@/components/LoadingScreen";

// Shown while the wardrobe resolves its signed image URLs — and right after an
// upload, so the capture screen's loader carries straight through to here with
// no plain black gap between them.
export default function Loading() {
  return <LoadingScreen />;
}
