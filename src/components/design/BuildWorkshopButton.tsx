"use client";

import { useState } from "react";
import NewWorkshopDialog from "./NewWorkshopDialog";

export default function BuildWorkshopButton({
  workshopCount,
}: {
  workshopCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div id="start-workshop" className="b-scope scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary btn-lg"
      >
        Build a workshop
      </button>
      {open && (
        <NewWorkshopDialog
          workshopCount={workshopCount}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
