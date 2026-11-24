import { isMemberId } from "@/features/discover/filters";
import { findProfilePostPhoto, profilePostsBucket } from "@/features/discover/profile-posts-data";
import { sharedSession } from "@/lib/server-session";
import { plusOneStorage } from "@/lib/plus-one-project";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: RouteContext<"/api/members/[memberId]/post-photos/[photoId]">) {
  const { memberId, photoId } = await params;
  if (!isMemberId(memberId) || !isMemberId(photoId)) return new Response(null, { status: 404, headers });

  const account = await sharedSession();
  if (account.kind !== "ready") {
    const status = { "signed-out": 401, forbidden: 403, unavailable: 503 }[account.kind];
    return new Response(null, { status, headers });
  }

  const { rows, error } = await findProfilePostPhoto(account, memberId, photoId);
  if (error) return new Response(null, { status: 503, headers });
  if (!rows[0]) return new Response(null, { status: 404, headers });

  const storage = plusOneStorage();
  if (!storage) return new Response(null, { status: 503, headers });
  const { data } = await storage.from(profilePostsBucket).download(rows[0].object_key, {}, { cache: "no-store" });
  if (!data || data.type !== "image/webp") return new Response(null, { status: 404, headers });
  return new Response(data, { headers: { ...headers, "Content-Type": "image/webp" } });
}
