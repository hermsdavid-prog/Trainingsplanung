"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";

export function ImprintDialog({
  trigger,
  triggerClassName,
}: {
  trigger?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "btn btn-ghost"}
        style={triggerClassName ? undefined : { padding: 0 }}
      >
        {trigger ?? "Impressum"}
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          showCloseButton={false}
          className="dc-dialog max-w-[480px] p-[30px_32px_34px]"
        >
          <div className="flex items-start justify-between gap-3.5">
            <div>
              <div className="kicker">Angaben gemäß § 5 TMG</div>
              <h3 className="mt-2 text-[26px] leading-[1.1]">Impressum</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Schließen"
              className="-mt-1.5 -mr-1.5 flex size-10 flex-none items-center justify-center text-[18px]"
              style={{ background: "transparent", border: 0, color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}
            >
              ✕
            </button>
          </div>
          <div className="mt-5 text-sm leading-[1.7]">
            <div className="kicker-muted">Verantwortlich für den Inhalt</div>
            <p className="mt-1.5">
              David Herms
              <br />
              Paul-Heyse-Str. 25
              <br />
              10407 Berlin
            </p>
            <div className="kicker-muted mt-4">Kontakt</div>
            <p className="mt-1.5">
              E-Mail:{" "}
              <a href="mailto:herms.david@gmail.com">herms.david@gmail.com</a>
            </p>
          </div>
          <button type="button" className="btn btn-primary mt-5" onClick={() => setOpen(false)}>
            Schließen
          </button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
