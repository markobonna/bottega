"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/room.js";
import type { DesignMedium } from "@/lib/design/project-art";

export interface RoomProject {
  id: string;
  name: string;
  medium: DesignMedium;
  stage: "sketch" | "shape" | "build" | "arrived";
  tagline: string;
}

function Icon({ svg }: { svg: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", flex: "none" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const KEY_ICON: Record<string, string> = {
  hardware: "parts",
  software: "screen",
  print: "pencil",
  recipe: "pot",
  space: "plan",
  music: "note",
  dance: "feet",
};

const KEY_BLURB: Record<string, string> = {
  hardware: "machines, fixtures, repairs",
  software: "apps, sites, the till",
  print: "menus, signs, posters",
  recipe: "drinks, dishes, specials",
  space: "layouts and fit-outs",
  music: "songs and jingles",
  dance: "routines and pieces",
};

export default function WorkshopScreen({
  workshop,
  projects,
  version,
}: {
  workshop: { id: string; name: string; type: string };
  projects: RoomProject[];
  version: string;
}) {
  const [view, setView] = useState<"room" | "list">("room");
  const B = window.B;
  const def =
    B.WORKSHOP_TYPES[workshop.type] ?? B.WORKSHOP_TYPES.other;
  const n = projects.length;
  const busy = projects.find((p) => p.stage === "build");
  const lede = n
    ? `${n} project${n === 1 ? "" : "s"}.${busy ? ` Your apprentice is at the ${busy.name.toLowerCase()}.` : ""}`
    : "An empty room, ready for work. Tell your apprentice what you want to make here.";

  const rm = useMemo(
    () =>
      B.art.room(
        {
          id: workshop.id,
          name: workshop.name,
          type: workshop.type,
          projects,
        },
        {},
      ),
    // Memoized on a server-computed version string, per the art contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  return (
    <div className="b-scope">
      <section className="intro">
        <div>
          <Link href="/" className="link-back">
            <Icon svg={B.icon("back")} /> Step back out to your world
          </Link>
          <h1 className="title">{workshop.name}</h1>
          <p className="lede">{lede}</p>
        </div>
        <div className="actions">
          <div className="seg" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === "room"}
              onClick={() => setView("room")}
            >
              <Icon svg={B.icon("room")} /> Room
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <Icon svg={B.icon("list")} /> List
            </button>
          </div>
          <Link
            href={`/new?workshop=${workshop.id}`}
            className="btn btn-primary btn-lg"
          >
            <Icon svg={B.icon("plus", 18, 2.4)} /> New project
          </Link>
        </div>
      </section>

      {view === "room" ? (
        <div>
          <div className="scene-pan">
            <div className="scene framed" style={{ aspectRatio: "16/9" }}>
              <div
                style={{ display: "contents" }}
                dangerouslySetInnerHTML={{ __html: rm.svg }}
              />
              {rm.spots.map(({ p, x, y, w, h }) => (
                <Link
                  key={`spot-${p.id ?? p.name}`}
                  href={`/projects/${p.id ?? p.name}`}
                  aria-label={`Open ${p.name}`}
                  className="spot-link"
                  style={{ left: x, top: y, width: w, height: h }}
                />
              ))}
              {rm.tags.map(({ p, x, y }) => {
                const medium = B.MEDIUMS[p.medium] ?? B.MEDIUMS.hardware;
                const pid = p.id ?? p.name;
                return (
                  <Link
                    key={pid}
                    href={`/projects/${pid}`}
                    style={{ left: x, top: y }}
                    className={`tag${p.stage === "sketch" ? " is-sketch" : ""}${p.stage === "build" ? " is-hot" : ""}`}
                  >
                    <span className="name">{p.name}</span>
                    <span className="meta">
                      <span
                        className={`dot ${B.fillLevel(p.stage)}`}
                        aria-hidden="true"
                      />
                      {medium.label} · {B.stageLabel(p).toLowerCase()}
                    </span>
                  </Link>
                );
              })}
              {rm.newSpot && (
                <Link
                  href={`/new?workshop=${workshop.id}`}
                  className="btn btn-primary spot-btn"
                  style={{ left: rm.newSpot.x, top: rm.newSpot.y }}
                >
                  <Icon svg={B.icon("plus", 18, 2.4)} /> New project
                </Link>
              )}
              <Link
                href="/"
                className="btn door-btn"
                style={{ left: rm.door.x, top: rm.door.y }}
              >
                <Icon svg={B.icon("back", 16)} /> Step outside
              </Link>
              {rm.overflow > 0 && (
                <button
                  type="button"
                  className="btn more-chip"
                  onClick={() => setView("list")}
                >
                  +{rm.overflow} more in the list
                </button>
              )}
              {n === 0 && (
                <div className="card scene-note">
                  <Icon svg={B.sigil(40)} />
                  <p
                    className="hand"
                    style={{ fontSize: 26, margin: "8px 0 0", lineHeight: 1.2 }}
                  >
                    This room is ready. Tell me what you want to make — or tap
                    the dashed spot on the bench.
                  </p>
                </div>
              )}
            </div>
          </div>
          <p className="pan-hint">Drag sideways to look around the room.</p>
        </div>
      ) : (
        <ul className="grid-cards">
          {projects.map((p) => {
            const medium = B.MEDIUMS[p.medium] ?? B.MEDIUMS.hardware;
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="card pcard"
                  style={
                    p.stage === "sketch"
                      ? { borderStyle: "dashed" }
                      : p.stage === "build"
                        ? { border: "2px solid var(--red)" }
                        : undefined
                  }
                >
                  <span className="eyebrow" style={{ margin: 0 }}>
                    {medium.label}
                  </span>
                  <span className="name">{p.name}</span>
                  <span
                    className={`pill${p.stage === "arrived" ? " dark" : p.stage === "sketch" ? " red" : ""}`}
                  >
                    <span
                      className={`dot ${B.fillLevel(p.stage)}`}
                      aria-hidden="true"
                    />
                    {B.stageLabel(p)}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href={`/new?workshop=${workshop.id}`}
              className="newcard"
            >
              <Icon svg={B.icon("plus", 28)} /> New project
            </Link>
          </li>
        </ul>
      )}

      <section className="below">
        <div className="main card apprentice-card">
          <Icon svg={B.sigil(48)} />
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">
              Your apprentice
              {busy ? ` · at the ${busy.name.toLowerCase()}` : ""}
            </p>
            <p className="said">
              {busy
                ? `I'm working on the ${busy.name.toLowerCase()}. Come and look, or start something new.`
                : n
                  ? "What should we make next?"
                  : "What should we make first?"}
            </p>
            <p className="small" style={{ margin: 0 }}>
              Ideas for {workshop.name}:
            </p>
            <div className="ideas">
              {def.examples.map((e) => (
                <Link
                  key={e}
                  href={`/new?workshop=${workshop.id}&idea=${encodeURIComponent(`I want to make ${e}`)}`}
                  className="chip"
                >
                  {B.cap(e)}
                </Link>
              ))}
            </div>
            {busy && (
              <p style={{ margin: "12px 0 0" }}>
                <Link
                  href={`/projects/${busy.id}`}
                  className="btn btn-dark"
                >
                  Open the {busy.name.toLowerCase()}{" "}
                  <Icon svg={B.icon("fwd")} />
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="side card dashed key">
          <p className="eyebrow" style={{ margin: 0 }}>
            What this room can make
          </p>
          <ul>
            {def.mediums.map((k) => (
              <li key={k}>
                <Icon svg={B.icon(KEY_ICON[k] ?? "parts", 22, 1.8)} />
                <span>
                  <strong>{B.MEDIUMS[k]?.label ?? k}</strong> — {KEY_BLURB[k]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
