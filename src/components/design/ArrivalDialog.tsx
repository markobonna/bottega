"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dismissArrival } from "@/app/projects/[id]/actions";
import type { DesignMedium } from "@/lib/design/project-art";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import "@/vendor/bottega/art/board.js";
import Dialog, { BIcon } from "./Dialog";
import NewProjectDialog from "./NewProjectDialog";
import PhotoCapture from "./PhotoCapture";

export default function ArrivalDialog({
  appId,
  project,
  workshop,
  head,
  line,
  arrivedLabel,
}: {
  appId: string;
  project: { name: string; medium: DesignMedium };
  workshop: { id: string; name: string; type: string };
  head: string;
  line: string;
  arrivedLabel: string;
}) {
  const B = window.B;
  const [creating, setCreating] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    void dismissArrival(appId);
  }, [appId]);

  const art = useMemo(
    () =>
      B.art.board(
        { name: project.name, medium: project.medium, stage: "arrived" },
        "render",
        { thumb: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appId],
  );

  if (closed) return null;
  if (creating) {
    return (
      <NewProjectDialog
        workshop={workshop}
        onClose={() => {
          setCreating(false);
          setClosed(true);
        }}
      />
    );
  }

  return (
    <Dialog
      labelledBy="arr-title"
      onClose={() => setClosed(true)}
      cls="arrival"
    >
      <div className="dialog-head">
        <span />
        <button
          type="button"
          className="icon-btn ghost"
          onClick={() => setClosed(true)}
          aria-label="Close"
        >
          <BIcon svg={B.icon("close", 20)} />
        </button>
      </div>
      <p className="eyebrow">{arrivedLabel}</p>
      <h2 className="big" id="arr-title">
        {head}
      </h2>
      <div className="board">
        <div
          style={{ display: "contents" }}
          dangerouslySetInnerHTML={{ __html: art.svg }}
        />
        <p className="stamp">{arrivedLabel}</p>
      </div>
      <p
        className="hand"
        style={{ fontSize: 26, margin: 0, lineHeight: 1.2 }}
      >
        {line}
      </p>
      <PhotoCapture
        appId={appId}
        id="arr-photo"
        label="Prove it landed — add a photo"
      />
      <div className="dialog-actions" style={{ justifyContent: "center" }}>
        <Link href={`/workshops/${workshop.id}`} className="btn">
          See it in {workshop.name}
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setCreating(true)}
        >
          <BIcon svg={B.icon("plus")} /> Start the next project
        </button>
      </div>
    </Dialog>
  );
}
