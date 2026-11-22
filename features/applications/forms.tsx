"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveReview, submitApplication } from "./actions";
import { applicationFields, emptyApplication, type FormFeedback } from "./form";

const fieldClass = "mt-1 w-full rounded-lg border border-accent/25 bg-white px-3 py-2 text-ink";
const buttonClass = "min-h-11 rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-ink disabled:opacity-60";
const initial: FormFeedback = {};

function submitKeepingAnswers(event: FormEvent<HTMLFormElement>, action: (form: FormData) => void) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  startTransition(() => action(form));
}

export function ApplicationForm() {
  const [feedback, action, pending] = useActionState(submitApplication, initial);
  const [values, setValues] = useState(emptyApplication);
  const [confirmedAdult, setConfirmedAdult] = useState(false);

  return (
    <form action={action} onSubmit={(event) => submitKeepingAnswers(event, action)} aria-busy={pending} className="mt-6 space-y-5">
      {feedback.message && <p role="alert" className="font-medium text-red-800">{feedback.message}</p>}
      {applicationFields.map(({ name, label, maxLength }) => {
        const id = `application-${name}`;
        const error = feedback.fields?.[name];
        const props = {
          id, name, maxLength, value: values[name], required: true,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `${id}-error` : undefined,
          className: fieldClass,
        };
        return (
          <div key={name}>
            <label htmlFor={id} className="font-semibold">{label}</label>
            {name === "introduction" ? (
              <textarea {...props} rows={4} onChange={(event) => setValues({ ...values, [name]: event.target.value })} />
            ) : (
              <input {...props} onChange={(event) => setValues({ ...values, [name]: event.target.value })} />
            )}
            {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-800">{error}</p>}
          </div>
        );
      })}
      <div>
        <label className="flex items-start gap-2 font-medium">
          <input
            className="mt-1 size-4 accent-accent"
            type="checkbox" name="adult" value="yes" required checked={confirmedAdult}
            onChange={(event) => setConfirmedAdult(event.target.checked)}
            aria-invalid={Boolean(feedback.fields?.adult)}
            aria-describedby={feedback.fields?.adult ? "application-adult-error" : undefined}
          />
          I confirm that I am at least 18 years old.
        </label>
        {feedback.fields?.adult && <p id="application-adult-error" className="mt-1 text-sm text-red-800">{feedback.fields.adult}</p>}
      </div>
      <button className={buttonClass} disabled={pending} type="submit">
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

export function ReviewForm({ id }: { id: string }) {
  const [feedback, action, pending] = useActionState(saveReview.bind(null, id), initial);
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [eligibilityVerified, setEligibilityVerified] = useState(false);

  return (
    <form action={action} onSubmit={(event) => submitKeepingAnswers(event, action)} aria-busy={pending} className="mt-5 space-y-4">
      {feedback.message && <p role="alert" className="font-medium text-red-800">{feedback.message}</p>}
      <label className="block font-semibold">
        Decision
        <select name="decision" required value={decision} className={fieldClass} onChange={(event) => setDecision(event.target.value)}>
          <option value="">Choose a decision</option>
          <option value="approved">Approve</option>
          <option value="declined">Decline</option>
        </select>
      </label>
      <label className="flex items-start gap-2">
        <input
          className="mt-1 size-4 accent-accent"
          type="checkbox" name="eligibilityVerified" value="yes" checked={eligibilityVerified}
          onChange={(event) => setEligibilityVerified(event.target.checked)}
        />
        I checked the applicant’s adult eligibility and identity.
      </label>
      <label className="block font-semibold">
        Private reason
        <textarea name="reason" required rows={4} maxLength={1000} className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <button className={buttonClass} disabled={pending} type="submit">
        {pending ? "Saving…" : "Save decision"}
      </button>
    </form>
  );
}
