"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accountQuery } from "@/lib/plus-one-db";
import { plusOneStorage } from "@/lib/plus-one-project";
import { sharedSession } from "@/lib/server-session";
import { profilePostsBucket } from "./profile-posts-data";
import { postableProfileId } from "./post-publisher";

type PublishState = { message: string };

export async function publishPost(_previous: PublishState, form: FormData): Promise<PublishState> {
  const account = await sharedSession();
  if (account.kind !== "ready" || !await postableProfileId(account.userId)) {
    return { message: "You need an approved, visible team profile to publish posts." };
  }
  const storage = plusOneStorage()?.from(profilePostsBucket);
  if (!storage) return { message: "Photo publishing is temporarily unavailable." };

  const files = form.getAll("photo");
  const descriptions = form.getAll("description");
  if (files.length < 1 || files.length > 6 || descriptions.length !== files.length) {
    return { message: "Choose between one and six photos." };
  }
  if (!files.every((file): file is File => file instanceof File && file.size > 0) ||
      !descriptions.every((alt): alt is string => typeof alt === "string" && alt.trim().length >= 1 && alt.trim().length <= 250)) {
    return { message: "Choose a photo and add a short description for each slide." };
  }
  if (files.reduce((bytes, file) => bytes + file.size, 0) > 3_500_000) {
    return { message: "Choose smaller photos. The total size limit is 3.5 MB." };
  }

  const photos: Buffer[] = [];
  for (const file of files) {
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 });
      const { format, pages } = await image.metadata();
      if (!format || !["jpeg", "png", "webp"].includes(format) || (pages ?? 1) > 1) {
        return { message: "Use still JPEG, PNG, or WebP photos." };
      }
      const photo = await image.rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 }).toBuffer();
      if (photo.length > 1_000_000) return { message: "One photo is too large after processing. Choose a smaller photo." };
      photos.push(photo);
    } catch {
      return { message: "A photo could not be read. Choose a valid JPEG, PNG, or WebP within 20 megapixels." };
    }
  }

  const postId = randomUUID();
  const photoIds = photos.map(() => randomUUID());
  const paths = photoIds.map((id) => `${postId}/${id}.webp`);
  const uploads = await Promise.allSettled(photos.map((photo, index) =>
    storage.upload(paths[index], photo, { contentType: "image/webp", upsert: false }),
  ));
  if (uploads.some((result) => result.status === "rejected" || result.value.error)) {
    await storage.remove(paths).catch(() => undefined);
    return { message: "Your photos could not be uploaded. Choose them again and retry." };
  }

  const { rows, error } = await accountQuery<{ profile_id: string | null }>(account.userId,
    "select plus_one.publish_own_profile_post($1, $2, $3) as profile_id",
    [postId, photoIds, descriptions.map((alt) => alt.trim())]);
  if (error) {
    // A lost database response may follow a successful commit. Keep the private objects for reconciliation.
    return { message: "Publishing could not be confirmed. Check your profile before trying again." };
  }
  const profileId = rows[0]?.profile_id;
  if (!profileId) {
    await storage.remove(paths).catch(() => undefined);
    return { message: "Your post could not be published. Check that your profile is visible and try again." };
  }
  revalidatePath("/members/" + profileId);
  redirect("/members/" + profileId + "#posts");
}
