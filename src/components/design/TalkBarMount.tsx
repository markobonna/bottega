"use client";

import dynamic from "next/dynamic";

const TalkBar = dynamic(() => import("./TalkBar"), { ssr: false });

export default function TalkBarMount() {
  return <TalkBar />;
}
