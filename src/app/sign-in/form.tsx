"use client";

import { useActionState } from "react";
import { DataNotice, Label, Status, btn } from "@/components/ui";
import { requestLink, type LinkState } from "./actions";

export function SignInForm({ initialError }: { initialError: string }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(
    requestLink,
    { ok: false, message: initialError },
  );
  return (
    <div>
      <h1 className="font-display text-3xl">Build your own Bottega.</h1>
      <form action={action} className="mt-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-[12px] border-[1.5px] border-line bg-card px-4 py-2.5 text-ink placeholder:text-muted"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className={`${btn.primary} mt-2 w-full`}
        >
          {pending ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      <div className="mt-4 flex flex-col gap-2">
        <Status tone={state.ok ? "ok" : "bad"}>{state.message}</Status>
        <DataNotice />
        <p className="text-sm text-muted">Made for adults (18+).</p>
      </div>
    </div>
  );
}
