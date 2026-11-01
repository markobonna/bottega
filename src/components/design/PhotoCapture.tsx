"use client";

import { useState } from "react";
import { saveArrivalPhoto } from "@/app/projects/[id]/actions";
import { uploadPhoto } from "@/lib/media";
import SmartPhotoInput from "./SmartPhotoInput";

/** Prove it happened: capture a photo, upload it, pin it to the project. */
export default function PhotoCapture({
  appId,
  id,
  label,
}: {
  appId: string;
  id: string;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState("");

  async function onPhoto(blob: Blob) {
    if (uploading) return;
    setUploading(true);
    setProblem("");
    try {
      const path = await uploadPhoto(appId, blob);
      const res = await saveArrivalPhoto(appId, path);
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
    } catch {
      setProblem("Couldn't save that photo. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <SmartPhotoInput
        id={id}
        label={label}
        buttonLabel={uploading ? "Uploading…" : "Take or choose a photo"}
        onPhoto={(blob) => void onPhoto(blob)}
        disabled={uploading || saved}
      />
      {saved && (
        <p className="small">Saved — it&apos;s pinned to your project.</p>
      )}
      {problem !== "" && (
        <p className="small" style={{ margin: 0, color: "var(--red)" }}>
          {problem}
        </p>
      )}
    </div>
  );
}
