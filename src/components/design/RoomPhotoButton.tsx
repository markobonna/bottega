"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRoomPhoto } from "@/app/actions";
import { uploadRoomPhoto } from "@/lib/media";
import SmartPhotoInput from "./SmartPhotoInput";

/** Photograph the real room; it hangs on the illustrated wall. */
export default function RoomPhotoButton({
  workshopId,
  hasPhoto,
}: {
  workshopId: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
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

  return (
    <div>
      <SmartPhotoInput
        id={`room-photo-${workshopId}`}
        label="Your real room"
        buttonLabel={
          uploading
            ? "Hanging it up…"
            : hasPhoto
              ? "Re-photograph your room"
              : "Photograph your real room"
        }
        onPhoto={(blob) => void onPhoto(blob)}
        disabled={uploading}
      />
      {problem !== "" && (
        <p className="small" style={{ margin: 0, color: "var(--red)" }}>
          {problem}
        </p>
      )}
    </div>
  );
}
