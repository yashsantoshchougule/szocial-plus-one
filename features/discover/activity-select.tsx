"use client";

import { activities, activityLabel } from "./filters";

export function ActivitySelect({ value, className }: { value: string; className: string }) {
  return (
    <select
      id="discover-activity"
      name="activity"
      className={className}
      defaultValue={value}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="">Any activity</option>
      {activities.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      {value && !activities.some((activity) => activity.value === value) && (
        <option value={value}>{activityLabel(value)}</option>
      )}
    </select>
  );
}
