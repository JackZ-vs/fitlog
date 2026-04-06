import { NextResponse, type NextRequest } from "next/server";

// Temporary passthrough to debug 404 on Vercel
export async function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals, static files, and public assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
