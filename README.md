# Szocial Plus One

Plus One is the separate, mobile-first Next.js website for Szocial's hourly companion booking pilot.
Use Node.js 24 and npm. Copy `.env.example` to `.env.local` when setting up shared authentication.

```sh
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open `http://127.0.0.1:3001/plus-one` to see the starter. **Explore Plus One** opens `/plus-one/dashboard`. The production build uses the same paths.

```sh
npm run lint
npm run typecheck
npm run build
npm run test:browser
```

The browser suite uses a production build and Chrome. Stop the dev server before running it so the suite can use port 3001. Set `CHROMIUM_PATH` to the absolute browser executable if it is installed outside its default location.

## Shared Szocial integration

Main Szocial provides sign-in. Plus One uses a separate Supabase project for business records and private photos. Configure the PLUS ONE website with these values from the two projects.

| Variable | Source and use |
| --- | --- |
| `SZOCIAL_AUTH_URL`, `SZOCIAL_AUTH_PUBLISHABLE_KEY` | Main project's canonical Supabase URL and publishable key, for server-side session verification. The old `NEXT_PUBLIC_SUPABASE_*` settings remain supported for Auth when the new settings are unset. |
| `PLUS_ONE_SUPABASE_URL`, `PLUS_ONE_SUPABASE_SECRET_KEY` | Separate Plus One project's canonical Supabase URL and server-only key for private Storage. |
| `PLUS_ONE_DATABASE_URL` | Plus One PostgreSQL connection for the `plus_one_runtime` login. Use the direct Supabase host or the same project's Supavisor connection. |

For hosted settings, use the two projects' canonical `https://<project-ref>.supabase.co` URLs. The website rejects a shared project URL and a PostgreSQL connection that targets a different project from Plus One Storage. For local testing, the services may use separate loopback origins.

The integrated website expects the Main Szocial origin in `SZOCIAL_PUBLIC_ORIGIN`. Main routes `/plus-one` to this website, shares its host-scoped Supabase Auth cookies, and validates the `returnTo` path before sending a user back after login. Leave the origin blank for an isolated UI preview.

Apply the versioned migrations in order on the separate Plus One project, through the migration for separate data. Keep the `plus_one` schema outside the Supabase Data API. Provision the runtime login password outside the repository after the migration and grant preflight pass. If earlier Plus One data exists in a shared project, reconcile and move only Plus One's business rows and bucket objects through a reviewed migration. Existing user UUIDs must be preserved. Account deletion and data retention are handled separately from sign-in revocation. See the [Order 02 record](plans/prompts/ORD-02%20-%20Shared%20Szocial%20Account.md) for staging and recovery.

## Review applications and publish team profiles

An applicant uses their Szocial account and submits the Plus One application. In **Review applications**, an authorized Plus One reviewer checks the submitted form, identity, adult eligibility, and background through the manual process. To approve, confirm both checks and save a private reason. A decline can be recorded when a check has not passed. Plus One stores the confirmation and decision. The reviewer should use the approved private process for any supporting evidence.

After approval, the member opens **Continue setup**, saves their profile details, and uploads a cover photo. Operations sets the rate in the Plus One database after the draft is saved. For example, with an approved rate of ₹600/hour, an authorized project operator can run this in the Plus One SQL Editor after replacing the UUID:

```sql
update plus_one.team_profiles
set hourly_rate_paise = 60000
where user_id = 'APPROVED_MAIN_AUTH_UUID'
  and plus_one.screened_for_team(user_id)
returning id, display_name, hourly_rate_paise;
```

The member can then publish the listing, edit details, and pause or resume bookings. A paused listing is removed from Discover. The screening migration preserves earlier approval records in a private archive and returns applicants without the new confirmation to **Pending review**. Previously visible listings are paused and require fresh approval and explicit resumption. Before staging, agree on background-check criteria and what supporting evidence, if any, may be retained.

## Publish a photo post as a team member

Apply the Plus One migrations in order and configure `PLUS_ONE_SUPABASE_SECRET_KEY` before enabling member uploads. On an approved team member's own eligible profile, select **Create post** to open Team setup. Add one to six still JPEG, PNG, or WebP photos in viewing order, describe each image, and select **Publish post**. The total input limit is 3.5 MB. The server re-encodes photos as WebP and removes source metadata before storing them in the private bucket. The first photo becomes the grid thumbnail.

The project operator can unpublish a post with the SQL below. After an upload or connection failure, keep any unlinked files private and reconcile them against `plus_one.profile_post_photos.object_key` before removing them through the Storage dashboard.

## Publish a member's photo post

After the project owner applies the Plus One migrations in order, use the Supabase Dashboard as a project operator. The `plus-one-profile-posts` bucket is private and accepts WebP files up to 1,000,000 bytes. Export photos as WebP and strip location metadata before uploading. Use new object names when replacing a photo.

1. In the SQL Editor, find the member's profile ID. The ID is also the last segment of their Discover profile URL.

   ```sql
   select id, display_name, area
   from plus_one.published_profiles
   order by display_name, id;
   ```

2. Create a draft and copy its returned ID. Replace `PROFILE_ID` and all subsequent `POST_ID` placeholders with the UUIDs from your project.

   ```sql
   insert into plus_one.profile_posts (profile_id)
   values ('PROFILE_ID')
   returning id;
   ```

3. In **Storage → plus-one-profile-posts**, create a folder named with the post ID. Upload your two WebP photos inside it with distinct UUID filenames. The filenames below are examples. Match the exact names you upload.

   ```sql
   insert into plus_one.profile_post_photos (post_id, position, alt_text, object_key)
   values
     ('POST_ID', 1, 'Outdoor tables by a stone arch',
       'POST_ID/11111111-1111-4111-8111-111111111111.webp'),
     ('POST_ID', 2, 'Tree lined street outside the cafe',
       'POST_ID/22222222-2222-4222-8222-222222222222.webp');

   select position, alt_text, object_key
   from plus_one.profile_post_photos
   where post_id = 'POST_ID'
   order by position;
   ```

4. Confirm the order and compare each key with the uploaded file. The first position becomes the thumbnail. The following query publishes only when a photo is attached and all referenced files exist. It should return one row. Open the profile through Discover as a signed-in viewer to confirm it appears.

   ```sql
   update plus_one.profile_posts p
   set published_at = now()
   where p.id = 'POST_ID' and p.published_at is null
     and exists (select 1 from plus_one.profile_post_photos f where f.post_id = p.id)
     and not exists (
       select 1 from plus_one.profile_post_photos f
       where f.post_id = p.id and not exists (
         select 1 from storage.objects o
         where o.bucket_id = 'plus-one-profile-posts' and o.name = f.object_key
       )
     )
   returning id, published_at;
   ```

5. To remove access or edit a published post, first unpublish it. To swap positions in a single transaction, defer the unique constraint with `set constraints plus_one.profile_post_photos_post_id_position_key deferred`. Publish again after verifying the files and order. For permanent removal, delete the draft in the SQL Editor and remove its files through the Storage dashboard.

   ```sql
   update plus_one.profile_posts set published_at = null where id = 'POST_ID';
   ```
