export const activities = [
  { value: "coffee", label: "Coffee" },
  { value: "city-outings", label: "City outings" },
  { value: "events", label: "Events" },
  { value: "walks", label: "Walks" },
  { value: "food", label: "Food and cafés" },
  { value: "arts-culture", label: "Arts and culture" },
] as const;

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const slug = /^[a-z][a-z0-9-]{0,39}$/;

export const isMemberId = (id: string) => id.length === 36 && uuid.test(id);

export function readFilters(params: Record<string, string | string[] | undefined>) {
  const area = typeof params.area === "string" ? params.area.trim().slice(0, 100) : "";
  const activity = typeof params.activity === "string" && slug.test(params.activity) ? params.activity : "";
  const cursor = typeof params.after === "string" && params.after.length === 64 ? params.after : "";
  const [date, id] = cursor.split(",");
  const parsedDate = new Date(date);
  const validDate = timestamp.test(date) && Number.isFinite(parsedDate.getTime())
    && parsedDate.toISOString() === date.slice(0, 23) + "Z";
  const after: [string, string] | null = id && isMemberId(id) && validDate ? [date, id] : null;
  return { area, activity, after };
}

export type DiscoverFilters = ReturnType<typeof readFilters>;

export function discoverHref(filters: Pick<DiscoverFilters, "area" | "activity">, after?: string) {
  const query = new URLSearchParams();
  if (filters.area) query.set("area", filters.area);
  if (filters.activity) query.set("activity", filters.activity);
  if (after) query.set("after", after);
  const search = query.toString();
  return search ? "/discover?" + search : "/discover";
}

export function activityLabel(value: string) {
  return activities.find((item) => item.value === value)?.label ?? value.replaceAll("-", " ");
}

export const hourlyRate = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 });
