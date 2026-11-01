"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBoardPhoto } from "@/app/projects/[id]/actions";
import type { DesignMedium } from "@/lib/design/project-art";
import { uploadPhoto } from "@/lib/media";
import SmartPhotoInput from "./SmartPhotoInput";

/** Progress photos pinned to the board; hardware can render one. */
export default function BuildGallery({
  appId,
  medium,
  photoUrls,
  photoPaths,
}: {
  appId: string;
  medium: DesignMedium;
  photoUrls: string[];
  photoPaths: string[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");

  async function onPhoto(blob: Blob) {
    if (uploading) return;
    setUploading(true);
    setProblem("");
    try {
      const path = await uploadPhoto(appId, blob);
      const res = await addBoardPhoto(appId, path);
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      setProblem("Couldn't save that photo. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function renderPrototype() {
    const photoPath = photoPaths[photoPaths.length - 1];
    if (!photoPath || rendering) return;
    setRendering(true);
    setStatus("");
    setProblem("");
    try {
      const res = await fetch("/api/project-look", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId, photoPath }),
      });
      if (!res.ok) throw new Error("render failed");
      setStatus("Rendered from your photo — see it on your workshop wall.");
      router.refresh();
    } catch {
      setProblem("Couldn't render that photo. Try again.");
    } finally {
      setRendering(false);
    }
  }

  return (
    <section aria-label="Build photos" style={{ marginTop: 20 }}>
      <h2 className="h2">Build photos</h2>
      {photoUrls.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {photoUrls.map((url, i) =>
            url === "" ? null : (
              <img
                key={photoPaths[i] ?? i}
                src={url}
                alt={`Build photo ${i + 1}`}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1.5px solid var(--line)",
                }}
              />
            ),
          )}
        </div>
      ) : (
        <p className="small">No photos yet — show the apprentice the work.</p>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 12,
          alignItems: "flex-end",
        }}
      >
        <SmartPhotoInput
          id={`build-photo-${appId}`}
          label="Photograph the work"
          buttonLabel={uploading ? "Pinning it up…" : "Photograph it"}
          onPhoto={(blob) => void onPhoto(blob)}
          disabled={uploading}
        />
        {medium === "hardware" && photoPaths.length > 0 && (
          <div>
            <span className="lbl" aria-hidden="true">
              Prototype render
            </span>
            <div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={rendering}
                onClick={() => void renderPrototype()}
              >
                {rendering
                  ? "Muse Image is drawing…"
                  : "Render my prototype"}
              </button>
            </div>
            <p className="small" style={{ marginBottom: 0 }}>
              Imagined from your latest photo and words.
            </p>
          </div>
        )}
      </div>
      {status !== "" && (
        <p className="small" role="status">
          {status}
        </p>
      )}
      {problem !== "" && (
        <p className="small" style={{ margin: 0, color: "var(--red)" }}>
          {problem}
        </p>
      )}
    </section>
  );
}
