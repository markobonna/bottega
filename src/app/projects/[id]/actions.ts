"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ACCENTS, type Accent } from "@/lib/accents";
import {
  effectiveStage,
  isMediumId,
  nextStage,
  type DesignMedium,
} from "@/lib/design/project-art";
import { signedUrls } from "@/lib/media";
import {
  addRecord,
  deleteRecord,
  listRecords,
  updateRecord,
  type DbRecord,
} from "@/lib/records";
import type { Op } from "@/lib/spec/ops";
import { createClient } from "@/lib/supabase/server";
import {
  ConciergeInput,
  forwardConciergeRequest,
  MailConfigError,
  replyBy,
} from "@/lib/concierge-mail";
import type { Json } from "@/lib/supabase/types";
import { listVersions, saveVersion, type VersionRow } from "@/lib/versions";
import { logEvent as writeEvent } from "@/lib/events";

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

function fail(e: unknown): Fail {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Something went wrong.",
  };
}

export async function getRecords(
  appId: string,
  collection: string,
): Promise<Ok<{ rows: DbRecord[] }> | Fail> {
  try {
    const supabase = await createClient();
    const rows = await listRecords(supabase, appId, collection);
    return { ok: true, rows };
  } catch (e) {
    return fail(e);
  }
}

export async function createRecord(
  appId: string,
  collection: string,
  data: Record<string, unknown>,
): Promise<Ok<{ row: DbRecord }> | Fail> {
  try {
    const supabase = await createClient();
    const row = await addRecord(supabase, appId, collection, data);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, row };
  } catch (e) {
    return fail(e);
  }
}

export async function saveRecord(
  appId: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Ok<{ row: DbRecord }> | Fail> {
  try {
    const supabase = await createClient();
    const row = await updateRecord(supabase, id, data);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, row };
  } catch (e) {
    return fail(e);
  }
}

export async function signPhotoPaths(
  paths: string[],
): Promise<Ok<{ urls: Record<string, string> }> | Fail> {
  try {
    const supabase = await createClient();
    const urls = await signedUrls(supabase, paths);
    return { ok: true, urls };
  } catch (e) {
    return fail(e);
  }
}

export async function removeRecord(
  appId: string,
  id: string,
): Promise<Ok<{ id: string }> | Fail> {
  try {
    const supabase = await createClient();
    const gone = await deleteRecord(supabase, id);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, ...gone };
  } catch (e) {
    return fail(e);
  }
}

export async function saveBlockLines(
  appId: string,
  baseVersion: number,
  blockId: string,
  lines: unknown,
  summary: string,
): Promise<Ok<{ conflict: boolean }> | Fail> {
  try {
    const supabase = await createClient();
    const op: Op = { op: "updateBlock", id: blockId, set: { lines } };
    const result = await saveVersion(supabase, appId, baseVersion, [op], {
      source: "inline",
      summary,
    });
    if ("conflict" in result) return { ok: true, conflict: true };
    revalidatePath(`/projects/${appId}`);
    return { ok: true, conflict: false };
  } catch (e) {
    return fail(e);
  }
}

export async function getOrCreateShare(
  appId: string,
  recordId: string,
): Promise<Ok<{ token: string }> | Fail> {
  try {
    const supabase = await createClient();
    const { data: existing, error: findError } = await supabase
      .from("shares")
      .select("token")
      .eq("app_id", appId)
      .eq("record_id", recordId)
      .eq("revoked", false)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (existing) return { ok: true, token: existing.token };
    const token = randomBytes(24).toString("base64url");
    const { error: insertError } = await supabase
      .from("shares")
      .insert({ app_id: appId, record_id: recordId, token });
    if (insertError) throw new Error(insertError.message);
    return { ok: true, token };
  } catch (e) {
    return fail(e);
  }
}

export async function revokeShare(
  token: string,
): Promise<Ok<{ revoked: true }> | Fail> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("shares")
      .update({ revoked: true })
      .eq("token", token);
    if (error) throw new Error(error.message);
    return { ok: true, revoked: true };
  } catch (e) {
    return fail(e);
  }
}

export async function getVersions(
  appId: string,
): Promise<Ok<{ versions: VersionRow[] }> | Fail> {
  try {
    const supabase = await createClient();
    const versions = await listVersions(supabase, appId);
    return { ok: true, versions };
  } catch (e) {
    return fail(e);
  }
}

export async function logEvent(
  appId: string,
  kind: string,
  detail: Json,
): Promise<void> {
  try {
    const supabase = await createClient();
    await writeEvent(supabase, appId, kind, detail);
  } catch {
    // Fire and forget: usage logging must never break the UI.
  }
}

export async function setPrivate(
  appId: string,
  priv: boolean,
): Promise<Ok<{ priv: boolean }> | Fail> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ private: priv })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, priv };
  } catch (e) {
    return fail(e);
  }
}

export async function setKind(
  appId: string,
  kind: string,
): Promise<Ok<{ kind: DesignMedium }> | Fail> {
  if (!isMediumId(kind)) return fail(new Error("bad kind"));
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ kind })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, kind };
  } catch (e) {
    return fail(e);
  }
}

export async function renameProject(
  appId: string,
  name: string,
): Promise<Ok<{ name: string }> | Fail> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return fail(new Error("Name the project."));
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ name: clean })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, name: clean };
  } catch (e) {
    return fail(e);
  }
}

export async function moveProject(
  appId: string,
  dir: -1 | 1,
): Promise<{ ok: true } | Fail> {
  try {
    const supabase = await createClient();
    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("workshop_id, position")
      .eq("id", appId)
      .single();
    if (appError || !app) throw new Error("No such project.");
    let query = supabase
      .from("apps")
      .select("id, position")
      .eq("workshop_id", app.workshop_id);
    query =
      dir > 0
        ? query.gt("position", app.position).order("position", {
            ascending: true,
          })
        : query.lt("position", app.position).order("position", {
            ascending: false,
          });
    const { data: sib } = await query.limit(1).maybeSingle();
    if (!sib) throw new Error("Nothing to swap with.");
    const { error: e1 } = await supabase
      .from("apps")
      .update({ position: sib.position })
      .eq("id", appId);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase
      .from("apps")
      .update({ position: app.position })
      .eq("id", sib.id);
    if (e2) throw new Error(e2.message);
    revalidatePath(`/workshops/${app.workshop_id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setAccent(
  appId: string,
  baseVersion: number,
  accent: string,
): Promise<Ok<{ conflict: boolean }> | Fail> {
  if (!(ACCENTS as readonly string[]).includes(accent)) {
    return fail(new Error("Bad accent."));
  }
  try {
    const supabase = await createClient();
    const op: Op = { op: "updateLook", accent: accent as Accent };
    const result = await saveVersion(supabase, appId, baseVersion, [op], {
      source: "inline",
      summary: `Changed the accent to ${accent}`,
    });
    if ("conflict" in result) return { ok: true, conflict: true };
    revalidatePath(`/projects/${appId}`);
    return { ok: true, conflict: false };
  } catch (e) {
    return fail(e);
  }
}

async function loadStage(appId: string) {
  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from("apps")
    .select("id, version, stage")
    .eq("id", appId)
    .maybeSingle();
  if (error || !app) throw new Error("No such project.");
  return { supabase, app };
}

export async function advanceStage(
  appId: string,
): Promise<Ok<{ stage: string }> | Fail> {
  try {
    const { supabase, app } = await loadStage(appId);
    const next = nextStage(effectiveStage(app.stage, app.version));
    if (!next) throw new Error("Nothing left to advance.");
    const { error } = await supabase
      .from("apps")
      .update({ stage: next })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true, stage: next };
  } catch (e) {
    return fail(e);
  }
}

export async function recordRfqSent(
  appId: string,
  vendors: { name: string; contact: string; address: string }[],
): Promise<{ ok: true } | Fail> {
  try {
    if (!vendors.length) throw new Error("Pick at least one maker.");
    const { supabase } = await loadStage(appId);
    const { error } = await supabase
      .from("apps")
      .update({
        stage: "sent",
        arrive_at: null,
        arrival_seen: false,
        order_info: {
          vendors: vendors.map((v) => ({
            name: v.name.slice(0, 120),
            contact: v.contact.slice(0, 20),
            address: v.address.slice(0, 200),
          })),
          sent_at: new Date().toISOString(),
        },
      })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function mergeOrderInfo(
  appId: string,
  set: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient();
  const { data: app, error: loadError } = await supabase
    .from("apps")
    .select("order_info")
    .eq("id", appId)
    .maybeSingle();
  if (loadError || !app) throw new Error("No such project.");
  const current =
    app.order_info && typeof app.order_info === "object"
      ? (app.order_info as Record<string, unknown>)
      : {};
  const { error } = await supabase
    .from("apps")
    .update({ order_info: { ...current, ...set } })
    .eq("id", appId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${appId}`);
}

/** The vendor's promised date, transcribed by the user from their reply. */
export async function savePromise(
  appId: string,
  date: string,
): Promise<{ ok: true } | Fail> {
  try {
    const at = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(at.getTime())) throw new Error("Pick a real date.");
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ arrive_at: at.toISOString(), arrival_seen: false })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    revalidatePath(`/projects/${appId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveArrivalPhoto(
  appId: string,
  path: string,
): Promise<{ ok: true } | Fail> {
  try {
    if (!path) throw new Error("No photo.");
    await mergeOrderInfo(appId, { arrival_photo: path.slice(0, 300) });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function arriveNow(appId: string, orderInfo?: Record<string, unknown>) {
  const { supabase } = await loadStage(appId);
  const { error } = await supabase
    .from("apps")
    .update({
      stage: "arrived",
      arrive_at: null,
      arrival_seen: false,
      ...(orderInfo ? { order_info: orderInfo } : {}),
    })
    .eq("id", appId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${appId}`);
}

export async function markInstalled(
  appId: string,
  target?: string,
): Promise<{ ok: true } | Fail> {
  try {
    await arriveNow(appId, target ? { target } : undefined);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markFinished(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    await arriveNow(appId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markArrived(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    await arriveNow(appId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function dismissArrival(
  appId: string,
): Promise<{ ok: true } | Fail> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("apps")
      .update({ arrival_seen: true })
      .eq("id", appId);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function submitConciergeRequest(
  appId: string,
  input: { email: string; note?: string },
): Promise<Ok<{ replyBy: string; notified: boolean; inbox: string }> | Fail> {
  const parsed = ConciergeInput.safeParse({
    email: input.email,
    note: input.note ?? "",
  });
  if (!parsed.success) {
    return fail(new Error(parsed.error.issues[0]?.message ?? "Bad input."));
  }
  try {
    const supabase = await createClient();
    const { data: app, error: loadError } = await supabase
      .from("apps")
      .select("id, name, kind, workshops ( name )")
      .eq("id", appId)
      .maybeSingle();
    if (loadError || !app) throw new Error("No such project.");
    const { error: insertError } = await supabase
      .from("concierge_requests")
      .insert({
        app_id: appId,
        email: parsed.data.email,
        note: parsed.data.note,
      });
    if (insertError) throw new Error(insertError.message);
    const by = replyBy();
    const inbox = process.env.CONCIERGE_INBOX || "";
    if (!inbox) {
      return { ok: true, replyBy: by, notified: false, inbox: "" };
    }
    try {
      const workshop = app.workshops as { name?: string } | null;
      await forwardConciergeRequest({
        to: inbox,
        replyTo: parsed.data.email,
        appName: app.name,
        workshopName:
          typeof workshop?.name === "string" ? workshop.name : "a workshop",
        kindLabel: app.kind ?? "project",
        note: parsed.data.note,
      });
    } catch (e) {
      // The queued row is the durable record; a failed forward still gets
      // seen in the table. Say so honestly.
      if (e instanceof MailConfigError) {
        return { ok: true, replyBy: by, notified: false, inbox };
      }
      throw e;
    }
    return { ok: true, replyBy: by, notified: true, inbox };
  } catch (e) {
    return fail(e);
  }
}

export type ProjectNote = {
  id: string;
  who: "you" | "apprentice";
  part: number | null;
  topic: string | null;
  text: string;
};

export async function addProjectNote(
  appId: string,
  note: {
    who: "you" | "apprentice";
    text: string;
    part?: number | null;
    topic?: string | null;
  },
): Promise<Ok<{ note: ProjectNote }> | Fail> {
  const text = note.text.trim().slice(0, 2000);
  if (!text) return fail(new Error("Write something first."));
  const topic = note.topic?.trim().slice(0, 32) || null;
  try {
    const supabase = await createClient();
    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id")
      .eq("id", appId)
      .maybeSingle();
    if (appError || !app) throw new Error("No such project.");
    const { data, error } = await supabase
      .from("project_notes")
      .insert({
        app_id: appId,
        who: note.who,
        text,
        part: note.part ?? null,
        topic,
      })
      .select("id, who, part, topic, text")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Couldn't save.");
    revalidatePath(`/projects/${appId}`);
    return {
      ok: true,
      note: {
        id: data.id,
        who: data.who === "apprentice" ? "apprentice" : "you",
        part: data.part,
        topic: data.topic,
        text: data.text,
      },
    };
  } catch (e) {
    return fail(e);
  }
}
