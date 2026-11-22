"use client";

import { useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";

const areas = ["Andheri", "Bandra", "Colaba", "Dadar", "Fort", "Juhu", "Powai"];
const other = "__other__";

export function AreaSelect({ value, className }: { value: string; className: string }) {
  const preset = areas.find((area) => area.toLowerCase() === value.toLowerCase());
  const [custom, setCustom] = useState(Boolean(value && !preset));

  function handleAreaChange(event: ChangeEvent<HTMLSelectElement>) {
    const { form, value: next } = event.currentTarget;
    if (next === other) {
      setCustom(true);
      return;
    }

    if (custom) {
      // Restore the dropdown's form field before submitting a preset.
      flushSync(() => setCustom(false));
    }
    form?.requestSubmit();
  }

  return (
    <div className="min-w-0">
      <label htmlFor="discover-area" className="text-sm font-semibold">Area</label>
      <select
        id="discover-area"
        name={custom ? undefined : "area"}
        defaultValue={custom ? other : preset ?? ""}
        className={className}
        onChange={handleAreaChange}
      >
        <option value="">Any area</option>
        {areas.map((area) => <option key={area} value={area}>{area}</option>)}
        <option value={other}>Other area…</option>
      </select>
      {custom && (
        <div className="mt-3">
          <label htmlFor="discover-custom-area" className="text-sm font-semibold">Custom area</label>
          <input
            id="discover-custom-area"
            name="area"
            defaultValue={preset ? "" : value}
            className={className}
            maxLength={100}
            required
          />
        </div>
      )}
    </div>
  );
}
