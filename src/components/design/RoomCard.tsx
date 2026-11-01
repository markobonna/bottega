"use client";

import Link from "next/link";
import { useRef, useState } from "react";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * A project's photo card floating in the room: headline above, picture
 * below, dragged as one unit. Three decisive states, no guessing:
 * quick click enters the project; press-and-hold (180ms) lifts the card
 * with a shadow so you SEE the grab; moving while held drags it, and
 * releasing after a hold never navigates. Positions are percents of
 * the scene.
 */
export default function RoomCard({
  id,
  name,
  meta,
  imageUrl,
  x,
  y,
  sceneRef,
  onMove,
}: {
  id: string;
  name: string;
  meta: string;
  imageUrl: string;
  x: number;
  y: number;
  sceneRef: React.RefObject<HTMLDivElement | null>;
  onMove: (x: number, y: number) => void;
}) {
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const [lifted, setLifted] = useState(false);
  const drag = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
    held: boolean;
  } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  const px = live?.x ?? x;
  const py = live?.y ?? y;

  function clearHold() {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function toPercent(
    clientX: number,
    clientY: number,
    origX: number,
    origY: number,
    startX: number,
    startY: number,
  ): { x: number; y: number } | null {
    const el = sceneRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const dx = ((clientX - startX) / rect.width) * 100;
    const dy = ((clientY - startY) / rect.height) * 100;
    return {
      x: clamp(origX + dx, 1, 99),
      y: clamp(origY + dy, 1, 97),
    };
  }

  function endDrag(clientX: number, clientY: number, cancelled: boolean) {
    clearHold();
    const d = drag.current;
    drag.current = null;
    setLifted(false);
    setLive(null);
    if (!d) return;
    if (d.moved) {
      // A real drag: never navigate, always save.
      suppressClick.current = true;
      if (!cancelled) {
        const next = toPercent(
          clientX,
          clientY,
          d.origX,
          d.origY,
          d.startX,
          d.startY,
        );
        if (next) onMove(next.x, next.y);
      }
    } else if (d.held) {
      // Hold without moving: a grab, not a click. Stay put, stay silent.
      suppressClick.current = true;
    }
    // Else: plain quick click — the Link navigates normally.
  }

  return (
    <Link
      href={`/projects/${id}`}
      aria-label={`Open ${name}`}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => {
        if (drag.current) e.preventDefault();
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        suppressClick.current = false;
        drag.current = {
          startX: e.clientX,
          startY: e.clientY,
          origX: px,
          origY: py,
          moved: false,
          held: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        holdTimer.current = setTimeout(() => {
          if (drag.current) {
            drag.current.held = true;
            setLifted(true);
          }
        }, 180);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
        if (dist > 6) {
          d.moved = true;
          d.held = true;
          clearHold();
          setLifted(true);
          const next = toPercent(
            e.clientX,
            e.clientY,
            d.origX,
            d.origY,
            d.startX,
            d.startY,
          );
          if (next) setLive(next);
        }
      }}
      onPointerUp={(e) => endDrag(e.clientX, e.clientY, false)}
      onPointerCancel={(e) => endDrag(e.clientX, e.clientY, true)}
      style={{
        position: "absolute",
        left: `${px}%`,
        top: `${py}%`,
        transform: `translate(-50%, 0) scale(${lifted ? 1.06 : 1})`,
        transition: "transform 120ms ease, box-shadow 120ms ease",
        width: "15%",
        minWidth: 96,
        textDecoration: "none",
        cursor: lifted ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        zIndex: lifted ? 5 : 2,
      }}
    >
      <span
        style={{
          display: "block",
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--ink)",
          background: "var(--card)",
          border: "1.5px solid var(--line)",
          borderBottom: "none",
          borderRadius: "6px 6px 0 0",
          padding: "3px 6px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </span>
      <span
        style={{
          display: "block",
          background: "var(--card)",
          border: "1.5px solid var(--line)",
          borderRadius: "0 0 6px 6px",
          padding: 5,
          boxShadow: lifted
            ? "0 8px 22px rgba(0,0,0,0.30)"
            : "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "1/1",
            objectFit: "cover",
            borderRadius: 3,
            pointerEvents: "none",
          }}
        />
        <span
          className="small"
          style={{
            display: "block",
            textAlign: "center",
            margin: "3px 0 0",
            color: "var(--muted)",
          }}
        >
          {meta}
        </span>
      </span>
    </Link>
  );
}
