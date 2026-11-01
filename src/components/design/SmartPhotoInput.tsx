"use client";

import { useState } from "react";
import { resizeToJpeg } from "@/lib/media";
import { isDim, meanLuminance } from "@/lib/photo-quality";

/**
 * Pick → resize → light check → hand over. A dim photo shows a preview
 * with "Use anyway" / "Choose another" (warn-and-allow, never a refusal);
 * a fine photo sails straight through.
 */
export default function SmartPhotoInput({
  id,
  label,
  buttonLabel,
  onPhoto,
  disabled,
}: {
  id: string;
  label: string;
  buttonLabel: string;
  onPhoto: (blob: Blob) => void;
  disabled?: boolean;
}) {
  const [checking, setChecking] = useState(false);
  const [candidate, setCandidate] = useState<{
    blob: Blob;
    url: string;
  } | null>(null);

  async function onPick(file: File | undefined) {
    if (!file || checking) return;
    setChecking(true);
    try {
      const blob = await resizeToJpeg(file);
      if (isDim(await meanLuminance(blob))) {
        setCandidate({ blob, url: URL.createObjectURL(blob) });
      } else {
        onPhoto(blob);
      }
    } catch {
      // Light check is advisory: if it fails, the photo still goes through.
      try {
        onPhoto(await resizeToJpeg(file));
      } catch {
        // Let the caller's own error handling speak.
      }
    } finally {
      setChecking(false);
    }
  }

  function useAnyway() {
    if (!candidate) return;
    URL.revokeObjectURL(candidate.url);
    onPhoto(candidate.blob);
    setCandidate(null);
  }

  function retake() {
    if (candidate) URL.revokeObjectURL(candidate.url);
    setCandidate(null);
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
        disabled={disabled || checking || candidate !== null}
        onChange={(e) => {
          void onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
      {candidate === null ? (
        <button
          type="button"
          className="btn"
          disabled={disabled || checking}
          onClick={() => document.getElementById(id)?.click()}
        >
          {checking ? "Checking the light…" : buttonLabel}
        </button>
      ) : (
        <div>
          <img
            src={candidate.url}
            alt="Preview of the photo you picked"
            style={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
          <p className="small">
            A bit dark — try with the light on? Or use it anyway.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={useAnyway}
            >
              Use anyway
            </button>
            <button type="button" className="btn" onClick={retake}>
              Choose another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
