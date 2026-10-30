"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AppSpec } from "@/lib/spec/schema";
import type { DbRecord } from "@/lib/records";
import BlockFrame from "./BlockFrame";
import { BlockComponents, type RuntimeApp } from "./registry";
import UnknownBlock from "./UnknownBlock";
import ChangeBar from "../workshop/ChangeBar";
import SettingsSheet from "../workshop/SettingsSheet";
import Suggestions from "../workshop/Suggestions";
import VersionChip from "../workshop/VersionHistory";

export default function AppRuntime({
  app,
  spec,
  records,
}: {
  app: RuntimeApp;
  spec: AppSpec;
  records: Record<string, DbRecord[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wanted = searchParams.get("s");
  const active =
    spec.screens.find((s) => s.id === wanted) ?? spec.screens[0] ?? null;

  const pick = (screenId: string) =>
    router.replace(`?s=${screenId}`, { scroll: false });
  const ctx = {
    appId: app.id,
    version: app.version,
    refresh: () => router.refresh(),
  };

  const tabs = (bar: boolean) => (
    <>
      {spec.screens.map((s) => {
        const on = active?.id === s.id;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => pick(s.id)}
            className={
              bar
                ? `flex flex-1 cursor-pointer flex-col items-center gap-0.5 px-1 py-1.5 text-xs ${on ? "text-ink" : "text-muted"}`
                : `cursor-pointer rounded-[8px] px-3 py-1.5 text-sm ${on ? "bg-accent-soft text-ink" : "text-muted"}`
            }
          >
            <span aria-hidden="true" className={bar ? "text-lg" : undefined}>
              {s.icon}
            </span>
            <span className="w-full truncate">{s.title}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div data-accent={spec.look.accent}>
      <Link
        href={app.workshop ? `/workshops/${app.workshop.id}` : "/"}
        className="text-muted text-sm underline-offset-4 hover:underline"
      >
        ← {app.workshop ? app.workshop.name : "Workshops"}
      </Link>
      <header className="mt-2 flex items-start gap-3">
        <span aria-hidden="true" className="text-3xl">
          {spec.look.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display truncate text-2xl">{app.name}</h1>
            <VersionChip appId={app.id} version={app.version} />
          </div>
          <p className="text-muted truncate text-sm">{spec.tagline}</p>
        </div>
        <SettingsSheet
          appId={app.id}
          initialPriv={app.private}
          initialKind={app.kind}
          spec={spec}
        />
      </header>

      {spec.screens.length > 0 && (
        <nav
          aria-label="Screens"
          className="mt-4 hidden gap-1 rounded-[12px] bg-card p-1 shadow-[inset_0_0_0_1.5px_var(--line)] sm:flex"
        >
          {tabs(false)}
        </nav>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {active == null && (
          <p className="text-muted">No screens yet.</p>
        )}
        {active !== null &&
          spec.screens.findIndex((s) => s.id === active.id) === 0 && (
            <Suggestions appId={app.id} version={app.version} />
          )}
        {active?.blocks.map((block) => {
          const collectionId =
            "collection" in block ? block.collection : null;
          const BlockView = BlockComponents[block.type] ?? UnknownBlock;
          return (
            <BlockFrame key={block.id} title={block.title}>
              <BlockView
                block={block}
                spec={spec}
                app={app}
                records={collectionId ? (records[collectionId] ?? []) : []}
                ctx={ctx}
              />
            </BlockFrame>
          );
        })}
      </div>

      <div aria-hidden="true" className="h-24 sm:h-16" />
      <ChangeBar appId={app.id} />

      {spec.screens.length > 0 && (
        <nav
          aria-label="Screens"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper pt-1 pb-[max(8px,env(safe-area-inset-bottom))] sm:hidden"
        >
          <div className="gutter mx-auto flex max-w-[720px]">{tabs(true)}</div>
        </nav>
      )}
    </div>
  );
}
