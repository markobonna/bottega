import { z } from "zod";

import { fail, readJson, requireUser } from "@/lib/api";
import {
  detectWorkshopType,
  isWorkshopTypeId,
} from "@/lib/design/workshop-types";
import { json } from "@/lib/meta";

export const runtime = "nodejs";
export const maxDuration = 30;

const ASK_SYSTEM = `You are Bottega's helper. Act on one person's spoken or typed request.
You know their workshops (id and name), the page they are on, and their open project if any.
You can: create a workshop (needs a name), open a workshop or project by name, or build a project (needs a workshop, a description of the work, and the kind: hardware, software, music, dance, print, recipe, or space).
Do the smallest thing that satisfies the request. If a slot is missing, ask exactly one short question and name the options (for example the workshop names, or "what kind — hardware, software, music, dance, print, recipe, or space?"). Always confirm the kind before building, unless the person already said which. Never invent ids. Never small talk. Keep say to one or two short sentences.
If they ask for anything else (edits, records, advice), say what you can do instead and set action_type to none.`;

const BodySchema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string() }))
    .max(6)
    .default([]),
  context: z
    .object({ appId: z.string().optional(), workshopId: z.string().optional() })
    .default({}),
});

const ReplySchema = z.object({
  say: z.string(),
  action_type: z
    .enum([
      "none",
      "create_workshop",
      "open_workshop",
      "open_project",
      "build_project",
    ])
    .nullable(),
  workshop_name: z.string().nullable().default(null),
  workshop_type: z.string().nullable().default(null),
  workshop_id: z.string().nullable().default(null),
  project_id: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  kind: z
    .enum([
      "hardware",
      "software",
      "music",
      "dance",
      "print",
      "recipe",
      "space",
    ])
    .nullable()
    .default(null),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const body = await readJson(req, BodySchema);
  if (body instanceof Response) return body;

  const { data: workshops } = await auth.supabase
    .from("workshops")
    .select("id, name")
    .order("created_at", { ascending: true });
  let appLine = "No project open.";
  if (!body.context.appId && body.context.workshopId) {
    const here = (workshops ?? []).find(
      (w) => w.id === body.context.workshopId,
    );
    if (here) appLine = `Browsing workshop: '${here.name}' (${here.id}).`;
  }
  if (body.context.appId) {
    const { data: app } = await auth.supabase
      .from("apps")
      .select("id, name")
      .eq("id", body.context.appId)
      .maybeSingle();
    if (app) appLine = `Open project: '${app.name}' (${app.id}).`;
  }
  const workshopLines = (workshops ?? [])
    .map((w) => `- '${w.name}' (${w.id})`)
    .join("\n");
  const history = body.history
    .map((h) => `${h.role === "user" ? "Person" : "You"}: ${h.text}`)
    .join("\n");

  try {
    const reply = await json(
      [
        { role: "system", content: ASK_SYSTEM },
        {
          role: "user",
          content: `Workshops:\n${workshopLines || "(none yet)"}\n${appLine}\n${history ? `So far:\n${history}\n` : ""}Person: ${body.message}`,
        },
      ],
      ReplySchema,
      { reasoning: "minimal", maxTokens: 800 },
    );

    const type = reply.action_type ?? "none";
    if (type === "create_workshop" && reply.workshop_name) {
      const name = reply.workshop_name.trim().slice(0, 40);
      const picked = reply.workshop_type ?? "";
      const { data, error } = await auth.supabase
        .from("workshops")
        .insert({
          name,
          type: isWorkshopTypeId(picked) ? picked : detectWorkshopType(name),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "create failed");
      return Response.json({ say: reply.say, navigate: `/workshops/${data.id}` });
    }
    if (type === "open_workshop" && reply.workshop_id) {
      const ok = (workshops ?? []).some((w) => w.id === reply.workshop_id);
      if (!ok) return Response.json({ say: "I couldn't find that workshop." });
      return Response.json({
        say: reply.say,
        navigate: `/workshops/${reply.workshop_id}`,
      });
    }
    if (type === "open_project" && reply.project_id) {
      const { data: target } = await auth.supabase
        .from("apps")
        .select("id")
        .eq("id", reply.project_id)
        .maybeSingle();
      if (!target) return Response.json({ say: "I couldn't find that project." });
      return Response.json({
        say: reply.say,
        navigate: `/projects/${reply.project_id}`,
      });
    }
    if (
      type === "build_project" &&
      reply.workshop_id &&
      reply.description &&
      reply.kind
    ) {
      const ok = (workshops ?? []).some((w) => w.id === reply.workshop_id);
      if (!ok) return Response.json({ say: "I couldn't find that workshop." });
      return Response.json({
        say: reply.say,
        build: {
          workshopId: reply.workshop_id,
          description: reply.description.slice(0, 1500),
          kind: reply.kind,
        },
      });
    }
    return Response.json({ say: reply.say });
  } catch (e) {
    return fail(e);
  }
}
