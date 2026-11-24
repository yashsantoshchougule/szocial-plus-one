import "server-only";
import { accountQuery } from "@/lib/plus-one-db";
import type { SharedAccount } from "@/lib/server-session";
import type { ProfilePost } from "./profile-posts";

type PhotoRow = { post_id: string; photo_id: string; alt_text: string };

export const profilePostsBucket = "plus-one-profile-posts";

export async function findProfilePosts(account: SharedAccount, profileId: string) {
  const { rows, error } = await accountQuery<PhotoRow>(account.userId, `
    select post_id, photo_id, alt_text
    from plus_one.visible_profile_post_photos
    where profile_id = $1
    order by published_at desc, post_id desc, position
  `, [profileId]);
  const posts = new Map<string, ProfilePost>();
  for (const row of rows) {
    let post = posts.get(row.post_id);
    if (!post) {
      post = { id: row.post_id, photos: [] };
      posts.set(row.post_id, post);
    }
    post.photos.push({
      alt: row.alt_text,
      src: `/plus-one/api/members/${profileId}/post-photos/${row.photo_id}`,
    });
  }
  return { posts: [...posts.values()], error };
}

export async function findProfilePostPhoto(account: SharedAccount, profileId: string, photoId: string) {
  return accountQuery<{ object_key: string }>(account.userId, `
    select object_key from plus_one.visible_profile_post_photos
    where profile_id = $1 and photo_id = $2
  `, [profileId, photoId]);
}
