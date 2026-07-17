import { redirect } from "next/navigation";

// The root has no content of its own. The app begins at the wardrobe;
// middleware sends anyone unauthenticated to /login first.
export default function RootPage() {
  redirect("/wardrobe");
}
