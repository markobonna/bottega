"use client";

import { useState } from "react";
import { saveArrivalPhoto } from "@/app/projects/[id]/actions";
import { resizeToJpeg, uploadPhoto } from "@/lib/media";

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

  async function onPhoto(file: File | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setProblem("");
    try {
      const path = await uploadPhoto(appId, await resizeToJpeg(file));
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
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={uploading || saved}
        onChange={(e) => void onPhoto(e.target.files?.[0])}
      />
      {uploading && <p className="small">Uploading…</p>}
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
