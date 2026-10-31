"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type BoardPanel from "./BoardPanel";

const Inner = dynamic(() => import("./BoardPanel"), {
  ssr: false,
  loading: () => <p className="text-muted">Loading…</p>,
});

export default function BoardPanelMount(
  props: ComponentProps<typeof BoardPanel>,
) {
  return <Inner {...props} />;
}
