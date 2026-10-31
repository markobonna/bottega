"use client";

import { useState } from "react";
import { submitConciergeRequest } from "@/app/projects/[id]/actions";

/**
 * A concierge request card: email + note, stored durably, reply promised
 * within 48 hours. Notification goes out from the server when SMTP is set;
 * otherwise the user's own mail client opens with a prefilled draft.
 */
export default function ConciergeCard({
  appId,
  idPrefix,
  headline,
  blurb,
  actionLabel,
  mailSubject,
  mailContext,
  onDone,
}: {
  appId: string;
  idPrefix: string;
  headline: string;
  blurb: string;
  actionLabel: string;
  mailSubject: string;
  mailContext: string;
  onDone?: (done: { email: string; replyBy: string }) => void;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [received, setReceived] = useState<{
    email: string;
    replyBy: string;
    mailed: boolean;
  } | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setProblem("");
    const res = await submitConciergeRequest(appId, { email, note });
    setBusy(false);
    if (!res.ok) {
      setProblem(res.error);
      return;
    }
    let mailed = false;
    if (!res.notified && res.inbox) {
      const body = `${mailContext}\nReply to: ${email.trim()}\n\n${note.trim()}`;
      window.location.href = `mailto:${res.inbox}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`;
      mailed = true;
    }
    setReceived({ email: email.trim(), replyBy: res.replyBy, mailed });
    onDone?.({ email: email.trim(), replyBy: res.replyBy });
  }

  if (received) {
    const by = new Date(received.replyBy);
    return (
      <p className="sim">
        {headline} — we&apos;ll reply to {received.email} by{" "}
        {Number.isNaN(by.getTime()) ? "within 48 hours" : by.toLocaleString()}.
        {received.mailed && " Your email app opened with the notification."}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <p style={{ margin: 0 }}>{blurb}</p>
      <div>
        <label className="lbl" htmlFor={`${idPrefix}-email`}>
          Your email
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          placeholder="you@somewhere.com"
          value={email}
          disabled={busy}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="lbl" htmlFor={`${idPrefix}-note`}>
          Anything to tell us (optional)
        </label>
        <input
          id={`${idPrefix}-note`}
          type="text"
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Material, size, deadline…"
        />
      </div>
      {problem !== "" && (
        <p className="small" style={{ margin: 0, color: "var(--red)" }}>
          {problem}
        </p>
      )}
      <div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : actionLabel}
        </button>
      </div>
    </form>
  );
}
