"use client";

import Link from "next/link";
import { useState } from "react";
import { say } from "@/lib/apprentice-client";

import "@/vendor/bottega/core.js";
import "@/vendor/bottega/types.js";
import "@/vendor/bottega/art/common.js";
import "@/vendor/bottega/art/world.js";
import { BIcon } from "./Dialog";
import NewWorkshopDialog from "./NewWorkshopDialog";
import WorldScene, { wsMeta, type SceneWorkshop } from "./WorldScene";

const EMPTY_IDEAS = [
  "I run a café on 5th Street and our grinder is terrible",
  "I have a garage and want a wall rack for my bikes",
  "I teach dance and need a new routine for the spring show",
  "I own a small store and the register keeps jamming",
];

export default function WorldScreen({
  workshops,
  version,
}: {
  workshops: SceneWorkshop[];
  version: string;
}) {
  const B = window.B;
  const [view, setView] = useState<"map" | "list">("map");
  const [creating, setCreating] = useState(false);
  const empty = workshops.length === 0;
  const lit = workshops.filter(
    (w) => B.isLit(w) && w.stage !== "sketch",
  );
  const lede = empty
    ? "Tell your apprentice about a place where you make things — type or talk below — or tap the empty lot."
    : `${workshops.length} workshop${workshops.length === 1 ? "" : "s"}.${lit.length ? ` ${lit.map((w) => w.name).join(" and ")}${lit.length === 1 ? " is" : " are"} lit.` : ""}`;

  const firstProject = workshops.flatMap((w) =>
    w.projects.map((p) => ({ ws: w, p })),
  )[0];
  const ideas = empty
    ? EMPTY_IDEAS
    : [
        ...(firstProject ? [`Open the ${firstProject.p.name}`] : []),
        `Go to the ${workshops[0].name}`,
        `I want to make ${(B.WORKSHOP_TYPES[workshops[0].type] ?? B.WORKSHOP_TYPES.other).examples[0]}`,
      ];

  return (
    <div className="b-scope">
      <section className="intro">
        <div>
          <p className="eyebrow">Your world</p>
          <h1 className="title">
            {empty ? "Let's build your world." : "Where are we working today?"}
          </h1>
          <p className="lede">{lede}</p>
        </div>
        <div className="actions">
          <div className="seg" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === "map"}
              onClick={() => setView("map")}
            >
              <BIcon svg={B.icon("map")} /> World
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <BIcon svg={B.icon("list")} /> List
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => setCreating(true)}
          >
            <BIcon svg={B.icon("plus", 18, 2.4)} /> New workshop
          </button>
        </div>
      </section>

      {view === "map" ? (
        <WorldScene
          workshops={workshops}
          version={version}
          empty={empty}
          onNewWorkshop={() => setCreating(true)}
        />
      ) : (
        <ul className="grid-cards">
          {workshops.map((ws) => {
            const m = wsMeta(ws);
            return (
              <li key={ws.id}>
                <Link
                  href={`/workshops/${ws.id}`}
                  className="card pcard"
                  style={
                    ws.stage === "sketch"
                      ? { borderStyle: "dashed" }
                      : undefined
                  }
                >
                  <BIcon
                    svg={B.art.houseIcon(ws.stage === "sketch" ? "ink" : "full")}
                  />
                  <span className="name">{ws.name}</span>
                  <span className="small">{m.text}</span>
                  <span
                    className={`pill${ws.stage === "sketch" ? " red" : " dark"}`}
                  >
                    {ws.stage === "sketch" ? "Sketched" : "Built"}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className="newcard"
              onClick={() => setCreating(true)}
            >
              <BIcon svg={B.icon("plus", 28)} /> New workshop
            </button>
          </li>
        </ul>
      )}

      <section className="below">
        <div className="main card apprentice-card">
          <BIcon svg={B.sigil(48)} />
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">Talk to your apprentice</p>
            <p className="said">
              {empty
                ? "Just say what you do and what bugs you. I'll draw the place and get to work."
                : "Say where to go, or what to make next."}
            </p>
            <p className="small" style={{ margin: 0 }}>
              Try saying — or type and talk in the bar below:
            </p>
            <div className="ideas">
              {ideas.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="chip"
                  onClick={() => say(t)}
                >
                  “{t}”
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="side card dashed key">
          <p className="eyebrow" style={{ margin: 0 }}>
            Map key
          </p>
          <ul>
            <li>
              <BIcon svg={B.art.houseIcon("ink")} />
              <span>
                <strong>Sketched</strong> — just described, still in ink
              </span>
            </li>
            <li>
              <BIcon svg={B.art.houseIcon("half")} />
              <span>
                <strong>Being built</strong> — color fills in as you go
              </span>
            </li>
            <li>
              <BIcon svg={B.art.houseIcon("full")} />
              <span>
                <strong>Built</strong> — lit windows mean recent work
              </span>
            </li>
          </ul>
        </div>
      </section>

      {creating && (
        <NewWorkshopDialog
          workshopCount={workshops.length}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
