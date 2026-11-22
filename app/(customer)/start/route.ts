import { NextResponse } from "next/server";
import { starterCookie } from "../starter-preference";

export function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: "/plus-one/dashboard",
      "Cache-Control": "no-store",
    },
  });
  response.cookies.set(starterCookie, "1", {
    path: "/plus-one",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
