import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("axus_refresh_token")?.value;
  const issuer = process.env.NEXT_PUBLIC_AXUS_ID_ISSUER || "https://axusid-website.vercel.app";

  if (refreshToken) {
    try {
      await fetch(`${issuer}/oauth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }),
      });
    } catch (err) {
      console.error("Failed to revoke refresh token during logout:", err);
    }
  }

  // Clear session cookies
  cookieStore.delete("auid");
  cookieStore.delete("username");
  cookieStore.delete("axus_access_token");
  cookieStore.delete("axus_refresh_token");

  return NextResponse.redirect(new URL("/", request.url));
}
