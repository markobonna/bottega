"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearRoomPhoto, saveRoomPhoto } from "@/app/actions";
import { uploadRoomPhoto } from "@/lib/media";
import SmartPhotoInput from "./SmartPhotoInput";

/** Photograph the real room; it becomes the room backdrop. */
export default function RoomPhotoButton({
  workshopId,
  hasPhoto,
}: {
  workshopId: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [problem, setProblem] = useState("");

  async function onPhoto(blob: Blob) {
    if (uploading) return;
    setUploading(true);
    setProblem("");
    try {
      const path = await uploadRoomPhoto(workshopId, blob);
      await saveRoomPhoto(workshopId, path);
      router.refresh();
    } catch {
      setProblem("Couldn't save that photo. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function onClear() {
    if (clearing || uploading) return;
    setClearing(true);
    setProblem("");
    try {
      await clearRoomPhoto(workshopId);
      router.refresh();
    } catch {
      setProblem("Couldn't remove that photo. Try again.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div>
      {hasPhoto ? (
        <button
          type="button"
          className="btn"
          onClick={() => void onClear()}
          disabled={uploading || clearing}
        >
          {clearing ? "Reverting…" : "Revert photograph"}
        </button>
      ) : (
        <SmartPhotoInput
          id={`room-photo-${workshopId}`}
          label="Your real room"
          buttonLabel={uploading ? "Saving…" : "Photograph your real room"}
          onPhoto={(blob) => void onPhoto(blob)}
          disabled={uploading || clearing}
        />
      )}
      {problem !== "" && (
        <p className="small" style={{ margin: 0, color: "var(--red)" }}>
          {problem}
        </p>
      )}
    </div>
  );
}
