import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login"]);

// Extract project ref from Supabase URL for cookie name lookup
// e.g. https://xyzxyz.supabase.co → xyzxyz
function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const host = new URL(url).hostname; // xyzxyz.supabase.co
    return host.split(".")[0];
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // If Supabase is not configured, skip auth (dev/mock mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.next();
  }

  // Optimistic check: look for Supabase session cookie
  // Real session validation happens in server components via @supabase/ssr
  const projectRef = getProjectRef();
  const hasSession = projectRef
    ? request.cookies.has(`sb-${projectRef}-auth-token`) ||
      request.cookies.has(`sb-${projectRef}-auth-token.0`) ||
      request.cookies.has(`sb-access-token`)
    : request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth"));

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirected", "1");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
