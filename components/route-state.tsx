import type { ReactNode } from "react";

export function RouteState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-xl rounded-2xl border border-accent/15 bg-white px-6 py-9 sm:px-9">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 leading-relaxed text-muted">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
