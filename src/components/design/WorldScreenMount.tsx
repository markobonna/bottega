"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type WorldScreen from "./WorldScreen";

const Inner = dynamic(() => import("./WorldScreen"), {
  ssr: false,
  loading: () => <p className="text-muted">Loading…</p>,
});

export default function WorldScreenMount(
  props: ComponentProps<typeof WorldScreen>,
) {
  return <Inner {...props} />;
}
