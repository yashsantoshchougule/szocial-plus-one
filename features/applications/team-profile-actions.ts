"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { accountQuery } from "@/lib/plus-one-db";
import { plusOneStorage } from "@/lib/plus-one-project";
import { sharedSession } from "@/lib/server-session";
import { discoverCoverBucket } from "@/features/discover/data";
import { activities } from "@/features/discover/filters";
import { readTeamSetup } from "./team-profile-data";

type Feedback = { message: string; saved?: boolean };

function updatePages(profileId: string) {
  revalidatePath("/team/setup");
  revalidatePath("/discover");
  revalidatePath("/members/" + profileId);
}

export async function saveTeamProfile(_previous: Feedback, form: FormData): Promise<Feedback> {
  const account = await sharedSession();
  if (account.kind !== "ready") return { message: "Sign in through Szocial to edit your team profile." };
  const read = (field: string) => {
    const value = form.get(field);
    return typeof value === "string" ? value.trim() : "";
  };
  const name = read("displayName");
  const area = read("area");
  const bio = read("bio");
  const languages = [...new Set(read("languages").split(",").map((language) => language.trim()).filter(Boolean))];
  const selected = [...new Set(form.getAll("activities"))];
  if (!name || name.length > 100 || !area || area.length > 100 || !bio || bio.length > 1500) {
    return { message: "Enter a display name, area, and bio within the field limits." };
  }
  if (languages.length < 1 || languages.length > 8 || languages.some((language) => language.length > 40)) {
    return { message: "Enter one to eight languages, separated by commas, with up to 40 characters each." };
  }
  if (!selected.length || selected.some((choice) => !activities.some(({ value }) => value === choice))) {
    return { message: "Choose at least one listed activity." };
  }

  const { rows, error } = await accountQuery<{ id: string | null }>(account.userId,
    "select plus_one.save_own_team_profile($1, $2, $3, $4, $5) as id",
    [name, area, bio, languages, selected]);
  if (error) return { message: "Your profile could not be saved. Try again." };
  const id = rows[0]?.id;
  if (!id) return { message: "Team profile setup requires an approved application and a verified background check." };
  updatePages(id);
  return { message: "Profile details saved.", saved: true };
}

export async function uploadTeamCover(_previous: Feedback, form: FormData): Promise<Feedback> {
  const account = await sharedSession();
  if (account.kind !== "ready") return { message: "Sign in through Szocial to upload a cover photo." };
  const { setup, error: setupError } = await readTeamSetup(account);
  if (setupError) return { message: "Your profile could not be loaded. Try again." };
  if (!setup?.allowed || !setup.profile) return { message: "Save your approved team's profile details before uploading a cover." };
  const storage = plusOneStorage()?.from(discoverCoverBucket);
  if (!storage) return { message: "Cover uploads are temporarily unavailable." };

  const file = form.get("cover");
  if (!(file instanceof File) || !file.size || file.size > 3_500_000) {
    return { message: "Choose a cover photo no larger than 3.5 MB." };
  }
  let bytes: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 });
    const { format, pages } = await image.metadata();
    if (!format || !["jpeg", "png", "webp"].includes(format) || (pages ?? 1) > 1) {
      return { message: "Choose a still JPEG, PNG, or WebP photo." };
    }
    bytes = await image.rotate().resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 77 }).toBuffer();
    if (bytes.length > 300_000) return { message: "Choose a smaller cover photo." };
  } catch {
    return { message: "The cover photo could not be read. Choose a valid photo within 20 megapixels." };
  }

  const imageId = randomUUID();
  const key = `${setup.profile.id}/${imageId}.webp`;
  const { error: storageError } = await storage.upload(key, bytes, { contentType: "image/webp", upsert: false });
  if (storageError) return { message: "The cover photo could not be uploaded. Choose it again and retry." };
  const { rows, error } = await accountQuery<{ id: string | null }>(account.userId,
    "select plus_one.set_own_team_cover($1) as id", [imageId]);
  if (error) return { message: "The upload could not be confirmed. Reload your profile before retrying." };
  const id = rows[0]?.id;
  if (!id) {
    await storage.remove([key]).catch(() => undefined);
    return { message: "The cover could not be saved. Check your application status and try again." };
  }
  updatePages(id);
  return { message: "Cover photo saved.", saved: true };
}

export async function changeTeamPublication(_previous: Feedback, form: FormData): Promise<Feedback> {
  const account = await sharedSession();
  if (account.kind !== "ready") return { message: "Sign in through Szocial to update your listing." };
  const action = form.get("publication");
  if (action !== "publish" && action !== "pause") return { message: "Choose a listing action." };
  const { rows, error } = await accountQuery<{ id: string | null }>(account.userId,
    "select plus_one.change_own_team_publication($1) as id", [action]);
  if (error || !rows[0]?.id) {
    return { message: "The listing could not be updated. Publishing requires approval, a cover photo, and a rate set by operations." };
  }
  updatePages(rows[0].id);
  return { message: action === "pause" ? "New bookings paused." : "Your listing is visible in Discover.", saved: true };
}
