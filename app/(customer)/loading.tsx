import { RouteState } from "@/components/route-state";

export default function Loading() {
  return (
    <div role="status">
      <RouteState title="Loading Plus One" description="Getting this page ready." />
    </div>
  );
}
