import "server-only";

import { z } from "zod";
import nodemailer from "nodemailer";

export const ConciergeInput = z.object({
  email: z.string().trim().email("Enter an email we can reply to."),
  note: z.string().trim().max(2000).default(""),
});

/** The 48-hour callback promise, as an ISO timestamp. */
export function replyBy(from: Date = new Date()): string {
  return new Date(from.getTime() + 48 * 3600000).toISOString();
}

export class MailConfigError extends Error {}

/**
 * Forward a sourcing request to the concierge inbox. Throws MailConfigError
 * when SMTP is not configured (the queued DB row is still the record).
 */
export async function forwardConciergeRequest(args: {
  to: string;
  replyTo: string;
  appName: string;
  workshopName: string;
  kindLabel: string;
  note: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  if (!user || !pass) {
    throw new MailConfigError("SMTP_USER/SMTP_PASS are not set.");
  }
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transport.sendMail({
    from: user,
    to: args.to,
    replyTo: args.replyTo,
    subject: `Sourcing request: ${args.appName} (${args.kindLabel})`,
    text: `A Bottega user needs a supplier sourced.

Project: ${args.appName}
Kind: ${args.kindLabel}
Workshop: ${args.workshopName}
Reply to: ${args.replyTo}
${args.note ? `\nWhat they told the shop:\n${args.note}\n` : ""}
48-hour rule: reply by ${replyBy()}.`,
  });
}
