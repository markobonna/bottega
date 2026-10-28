"use client";

import { LIM, pushWords, type Brain } from "@/lib/brain";

export interface DialDim {
  name: string;
  hint: string;
}

// One dial per dim plus the starting lean. selectedX (the checked photo's
// features) draws each dim's live vote under its dial.

export default function Dials({
  dims,
  brain,
  selectedX,
  disabled,
  onDial,
  onBias,
  onRelease,
}: {
  dims: DialDim[];
  brain: Brain;
  selectedX: number[] | null;
  disabled: boolean;
  onDial: (k: number, v: number) => void;
  onBias: (v: number) => void;
  onRelease: () => void;
}) {
  const [labelA, labelB] = brain.labels;
  const votes =
    selectedX !== null && selectedX.length === brain.w.length
      ? selectedX.map((x, k) => x * brain.w[k])
      : null;
  return (
    <div className="flex flex-col gap-3">
      {dims.map((dim, k) => (
        <div key={dim.name}>
          <p className="text-sm font-semibold">
            {dim.name}{" "}
            <span className="font-normal text-muted">{dim.hint}</span>
          </p>
          <input
            type="range"
            min={-LIM}
            max={LIM}
            step={0.1}
            disabled={disabled}
            aria-label={`${dim.name} dial. Left pushes toward ${labelA}, right toward ${labelB}`}
            value={brain.w[k]}
            onChange={(e) => onDial(k, Number(e.target.value))}
            onPointerUp={onRelease}
            onKeyUp={onRelease}
            onBlur={onRelease}
            className="dial-in"
          />
          {votes !== null && (
            <div className="mt-1 flex items-center gap-2">
              <div
                aria-hidden="true"
                className="relative h-2 flex-1 rounded-full bg-line"
              >
                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-ink" />
                <div
                  className="absolute top-0 bottom-0 rounded-full"
                  style={{
                    left:
                      votes[k] >= 0
                        ? "50%"
                        : `${50 - (Math.abs(votes[k]) / LIM) * 50}%`,
                    width: `${(Math.abs(votes[k]) / LIM) * 50}%`,
                    backgroundColor:
                      votes[k] >= 0 ? "var(--side-b)" : "var(--side-a)",
                  }}
                />
              </div>
              <p className="shrink-0 text-xs text-muted">
                {pushWords(votes[k], brain)}
              </p>
            </div>
          )}
        </div>
      ))}
      <div>
        <p className="text-sm font-semibold">Starting lean</p>
        <input
          type="range"
          min={-LIM}
          max={LIM}
          step={0.1}
          disabled={disabled}
          aria-label={`Starting lean dial. Left pushes toward ${labelA}, right toward ${labelB}`}
          value={brain.b}
          onChange={(e) => onBias(Number(e.target.value))}
          onPointerUp={onRelease}
          onKeyUp={onRelease}
          onBlur={onRelease}
          className="plain-in"
        />
      </div>
    </div>
  );
}
