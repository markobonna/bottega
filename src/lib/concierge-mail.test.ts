import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  ConciergeInput,
  MailConfigError,
  forwardConciergeRequest,
  replyBy,
} from "./concierge-mail";

describe("concierge mail", () => {
  it("accepts an email and trims the note", () => {
    const out = ConciergeInput.parse({
      email: "  shop@example.com ",
      note: "  plywood  ",
    });
    expect(out.email).toBe("shop@example.com");
    expect(out.note).toBe("plywood");
  });
  it("rejects a bad email", () => {
    expect(() =>
      ConciergeInput.parse({ email: "not-an-email", note: "" }),
    ).toThrow();
  });
  it("promises 48 hours", () => {
    const from = new Date("2026-10-31T12:00:00Z");
    expect(replyBy(from)).toBe("2026-11-02T12:00:00.000Z");
  });
  it("refuses to send without SMTP config", async () => {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    try {
      await expect(
        forwardConciergeRequest({
          to: "inbox@example.com",
          replyTo: "shop@example.com",
          appName: "Rack",
          workshopName: "Garage",
          kindLabel: "Hardware",
          note: "",
        }),
      ).rejects.toBeInstanceOf(MailConfigError);
    } finally {
      if (user !== undefined) process.env.SMTP_USER = user;
      if (pass !== undefined) process.env.SMTP_PASS = pass;
    }
  });
});
