"use client";

import { btn, card } from "@/components/ui";

export interface PreviewDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

export default function DiffPreview({
  summary,
  preview,
  busy,
  onAccept,
  onDiscard,
}: {
  summary: string;
  preview: PreviewDiff;
  busy: boolean;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  const empty =
    preview.added.length === 0 &&
    preview.changed.length === 0 &&
    preview.removed.length === 0;
  return (
    <div className={`${card} w-full p-3`}>
      <p className="font-medium">{summary}</p>
      {empty ? (
        <p className="mt-1 text-sm text-muted">No visible changes.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {preview.added.map((line, i) => (
            <li key={`+${i}`} className="text-ok">
              + {line}
            </li>
          ))}
          {preview.changed.map((line, i) => (
            <li key={`~${i}`} className="text-brass">
              ~ {line}
            </li>
          ))}
          {preview.removed.map((line, i) => (
            <li key={`-${i}`} className="text-bad">
              − {line}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className={btn.primary}
        >
          {busy ? "Saving…" : "Accept"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDiscard}
          className={btn.quiet}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
