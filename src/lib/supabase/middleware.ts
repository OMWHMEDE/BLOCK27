import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require a session. An unauthenticated hit is redirected to /login.
const PROTECTED_PREFIXES = ["/wardrobe", "/capture", "/garments"];

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
