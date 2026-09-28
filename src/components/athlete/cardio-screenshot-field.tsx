"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compress";
import { setCardioScreenshotAction, removeCardioScreenshotAction } from "@/lib/actions/feedback";
import { CARDIO_SCREENSHOT_BUCKET, cardioScreenshotPath } from "@/lib/cardio-screenshots";

// Heart-rate screenshot for one cardio item: pick an image, it's shrunk in
// the browser, uploaded straight to the private Storage bucket, then linked
// to the athlete's feedback row by a server action.
export function CardioScreenshotField({
  athleteId,
  itemId,
  initialUrl,
}: {
  athleteId: string;
  itemId: string;
  initialUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild auswählen.");
      return;
    }
    setBusy("upload");
    try {
      const blob = await compressImage(file);
      const path = cardioScreenshotPath(athleteId, itemId);
      const { error: uploadError } = await createClient()
        .storage.from(CARDIO_SCREENSHOT_BUCKET)
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw new Error("Upload fehlgeschlagen.");
      const result = await setCardioScreenshotAction(itemId, path);
      if (result.error) throw new Error(result.error);
      setUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      toast.success("Screenshot gespeichert.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy("remove");
    const result = await removeCardioScreenshotAction(itemId);
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setUrl(null);
    toast.success("Screenshot entfernt.");
  }

  return (
    <div className="mt-3.5">
      <div className="text-[13px] font-semibold" style={{ color: "var(--dc-text)" }}>
        Herzfrequenz-Screenshot
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {url ? (
        <div className="mt-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="block" aria-label="Screenshot in voller Größe öffnen">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed/blob URL, not optimisable */}
            <img
              src={url}
              alt="Herzfrequenzverlauf"
              className="block max-h-[220px] w-auto max-w-full"
              style={{ border: "1px solid var(--dc-divider)", background: "#fff" }}
            />
          </a>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
            >
              {busy === "upload" ? "Wird hochgeladen…" : "Ersetzen"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={handleRemove}>
              {busy === "remove" ? "…" : "Entfernen"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-secondary mt-2"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          {busy === "upload" ? "Wird hochgeladen…" : "Screenshot hochladen"}
        </button>
      )}
      <p className="mt-1.5 text-xs" style={{ color: "var(--dc-muted)" }}>
        Z. B. aus deiner Uhr-App. Wird nach 6 Monaten automatisch gelöscht.
      </p>
    </div>
  );
}
