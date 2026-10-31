"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type WorkshopScreen from "./WorkshopScreen";

const Inner = dynamic(() => import("./WorkshopScreen"), {
  ssr: false,
  loading: () => <p className="text-muted">Loading…</p>,
});

export default function WorkshopScreenMount(
  props: ComponentProps<typeof WorkshopScreen>,
) {
  return <Inner {...props} />;
}
