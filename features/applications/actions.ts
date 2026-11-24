"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accountQuery } from "@/lib/plus-one-db";
import { applicationSession } from "./data";
import { isApplicationId, readApplicationFields, readReviewDecision, type FormFeedback } from "./form";

export async function submitApplication(_previous: FormFeedback, form: FormData): Promise<FormFeedback> {
  const session = await applicationSession();
  if (session.kind !== "ready") return { message: "Sign in through Szocial to submit an application." };

  const { values, errors } = readApplicationFields(form);
  if (Object.keys(errors).length) {
    return { message: "Check the fields below and try again.", fields: errors };
  }

  const { error } = await accountQuery(session.userId, `
    insert into plus_one.team_member_applications
      (applicant_id, display_name, area, languages, introduction, activities, adult_attested)
    values ($1, $2, $3, $4, $5, $6, true)
    on conflict (applicant_id) do nothing
  `, [session.userId, values.displayName, values.area, values.languages, values.introduction, values.activities]);

  if (error) return { message: "Your application could not be saved. Your answers are still here. Try again." };
  revalidatePath("/application");
  revalidatePath("/dashboard");
  redirect("/application");
}

export async function saveReview(id: string, _previous: FormFeedback, form: FormData): Promise<FormFeedback> {
  if (!isApplicationId(id)) return { message: "This application could not be found." };

  const session = await applicationSession(true);
  if (session.kind !== "ready") return { message: "Reviewer access is required to save a decision." };

  const review = readReviewDecision(form);
  if ("message" in review) return { message: review.message };

  const { rows, error } = await accountQuery<{ saved: boolean }>(session.userId,
    "select plus_one.review_application($1, $2, $3, $4, $5) as saved",
    [id, review.decision, review.reason, review.eligibilityVerified, review.backgroundVerified]);

  if (error) return { message: "The decision could not be saved. Try again." };
  if (rows[0]?.saved !== true) return { message: "This application cannot be reviewed. Open the queue for its current status." };

  const detail = `/admin/applications/${id}`;
  revalidatePath("/admin/applications");
  revalidatePath("/application");
  revalidatePath("/dashboard");
  revalidatePath(detail);
  redirect(detail);
}
