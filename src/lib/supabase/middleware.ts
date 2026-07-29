import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  isGuestId,
} from "@/lib/guest/identity";

// Routes that require a session. An unauthenticated hit is redirected to /login.
//
// The app shell — /wardrobe and /outfits — is deliberately NOT here: a visitor
// with no account lands straight in it as a guest (cookie identity, guest
// tables), like opening Claude or ChatGPT. Those pages render a guest variant
// when there is no session. The gates that must stay closed to a guest —
// capture (base is paid), the signed-in garment uploaders, shopping, settings —
// are still listed and still bounce to /login.
const PROTECTED_PREFIXES = [
  "/capture",
  "/garments",
  "/shopping",
  "/settings",
];

// Routes an authenticated user should not see. They are bounced to the app.
const AUTH_PREFIXES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthRoute = AUTH_PREFIXES.some((p) => path.startsWith(p));

  // This proxy runs on every route. It must never be the thing that 500s the
  // whole site. `createServerClient` throws synchronously when the Supabase
  // env is missing or malformed (e.g. NEXT_PUBLIC_* absent at build time), and
  // getUser() can fail on a bad host — so resolve the user defensively and, on
  // any failure, degrade to logged-out. Fail closed: public routes still
  // render, protected routes bounce to /login. The failure is logged loudly so
  // a misconfigured deploy is visible in the server logs, not to the user.
  const user = await resolveUser(request, (next) => {
    supabaseResponse = next;
  });

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/wardrobe";
    return NextResponse.redirect(url);
  }

  // Guest identity at the edge. A visitor with no account gets a stable guest id
  // minted on arrival — BEFORE their first upload — so the guest routes only ever
  // READ this cookie, never create it mid-request. This is the fix for the
  // vanishing guest upload: the id used to be created inside the POST, and when
  // that fresh cookie didn't survive to the follow-up GET, the listing looked up
  // a different (or missing) id and the piece disappeared. Set on both the
  // request (so this request's handler sees it) and the response (so the browser
  // keeps it). A cookie with no pieces creates no data — nothing to purge.
  if (!user && !isGuestId(request.cookies.get(GUEST_COOKIE)?.value)) {
    const id = crypto.randomUUID();
    request.cookies.set(GUEST_COOKIE, id);
    supabaseResponse.cookies.set(GUEST_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  }

  return supabaseResponse;
}

async function resolveUser(
  request: NextRequest,
  onResponse: (next: NextResponse) => void,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[proxy] Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
        "Auth is disabled for this deploy; treating every request as logged-out. " +
        "Set both at BUILD time in the deploy environment — they are inlined at build, not read at runtime.",
    );
    return null;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          const next = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            next.cookies.set(name, value, options),
          );
          onResponse(next);
        },
      },
    });

    // IMPORTANT: getUser() revalidates the token. Nothing else runs between
    // creating the client and this call, or sessions behave unpredictably.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.error("[proxy] Supabase session check failed:", err);
    return null;
  }
}
