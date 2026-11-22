export const applicationFields = [
  { name: "displayName", label: "Display name", maxLength: 100 },
  { name: "area", label: "City or general area", maxLength: 120 },
  { name: "languages", label: "Languages", maxLength: 150 },
  { name: "introduction", label: "Short introduction", maxLength: 600 },
  { name: "activities", label: "Preferred activities", maxLength: 200 },
] as const;

export type ApplicationField = (typeof applicationFields)[number]["name"];
export type ApplicationValues = Record<ApplicationField, string>;
export type FormFeedback = {
  message?: string;
  fields?: Partial<Record<ApplicationField | "adult", string>>;
};

export const emptyApplication: ApplicationValues = {
  displayName: "",
  area: "",
  languages: "",
  introduction: "",
  activities: "",
};

export function readApplicationFields(form: FormData) {
  const values = { ...emptyApplication };
  const errors: NonNullable<FormFeedback["fields"]> = {};

  for (const { name, maxLength } of applicationFields) {
    const value = form.get(name);
    values[name] = typeof value === "string" ? value.trim() : "";
    if (!values[name]) errors[name] = "Enter a value.";
    else if (values[name].length > maxLength) errors[name] = `Use ${maxLength} characters or fewer.`;
  }

  if (form.get("adult") !== "yes") errors.adult = "Confirm that you are at least 18.";

  return { values, errors };
}

export function readReviewDecision(form: FormData) {
  const decision = form.get("decision");
  const value = form.get("reason");
  const reason = typeof value === "string" ? value.trim() : "";
  const eligibilityVerified = form.get("eligibilityVerified") === "yes";

  if (decision !== "approved" && decision !== "declined") {
    return { message: "Choose whether to approve or decline the application." } as const;
  }
  if (!reason || reason.length > 1000) {
    return { message: "Enter a private reason using 1 to 1,000 characters." } as const;
  }
  if (decision === "approved" && !eligibilityVerified) {
    return { message: "Confirm that adult eligibility and identity have been checked before approving." } as const;
  }

  return { decision, reason, eligibilityVerified } as const;
}

export const isApplicationId = (id: string) =>
  /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id);
