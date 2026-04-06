import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  try {
    // Skip if Supabase is not configured (dev/mock mode)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return NextResponse.next();

    // Derive project ref from URL: https://<ref>.supabase.co
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

    // Check for any Supabase session cookie
    const cookies = request.cookies;
    const hasSession =
      cookies.has(`sb-${projectRef}-auth-token`) ||
      cookies.has(`sb-${projectRef}-auth-token.0`) ||
      cookies.has(`sb-${projectRef}-auth-token.1`) ||
      cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirected", "1");
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // On any error, pass through — auth is also enforced in server components
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon\\.ico|api/).*)",
  ],
};
