"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRetentionAction } from "@/lib/actions/consent";

export function RetentionField({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (value === initialValue) return;
    const formData = new FormData();
    formData.set("value", value);
    startTransition(async () => {
      const result = await updateRetentionAction({}, formData);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div className="field" style={{ width: 220, margin: 0 }}>
      <label htmlFor="retention">Aufbewahrung nach Austritt</label>
      <input
        id="retention"
        className="input"
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
      />
    </div>
  );
}
