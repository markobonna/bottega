"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import "@/vendor/bottega/core.js";
import { BIcon } from "./design/Dialog";

interface Nav {
  workshops: { id: string; name: string }[];
  projects: { id: string; name: string; workshopId: string }[];
}

let cached: Promise<Nav> | null = null;

function loadNav(): Promise<Nav> {
  if (!cached) {
    cached = fetch("/api/nav")
      .then((r) => (r.ok ? r.json() : { workshops: [], projects: [] }))
      .catch(() => ({ workshops: [], projects: [] }));
  }
  return cached;
}

export default function Crumbs() {
  const pathname = usePathname();
  const [nav, setNav] = useState<Nav | null>(null);
  useEffect(() => {
    void loadNav().then(setNav);
  }, [pathname]);

  const B = window.B;
  const parts = pathname.split("/").filter(Boolean);
  const sep = (
    <li className="sep" aria-hidden="true">
      <BIcon svg={B.icon("chev", 16)} />
    </li>
  );

  let trail: ReactNode = null;
  if (parts[0] === "workshops" && parts[1]) {
    const ws = nav?.workshops.find((w) => w.id === parts[1]);
    trail = (
      <>
        <li>
          <Link href="/">Your world</Link>
        </li>
        {sep}
        <li aria-current="page">{ws?.name ?? "…"}</li>
      </>
    );
  } else if (parts[0] === "projects" && parts[1]) {
    const p = nav?.projects.find((x) => x.id === parts[1]);
    const ws = nav?.workshops.find((w) => w.id === p?.workshopId);
    trail = (
      <>
        <li>
          <Link href="/">Your world</Link>
        </li>
        {sep}
        <li>
          {ws ? <Link href={`/workshops/${ws.id}`}>{ws.name}</Link> : "…"}
        </li>
        {sep}
        <li aria-current="page">{p?.name ?? "…"}</li>
      </>
    );
  } else if (parts[0] === "new") {
    const q = new URLSearchParams(window.location.search).get("workshop");
    const ws = nav?.workshops.find((w) => w.id === q);
    trail = (
      <>
        <li>
          <Link href="/">Your world</Link>
        </li>
        {sep}
        <li>
          {ws ? <Link href={`/workshops/${ws.id}`}>{ws.name}</Link> : "…"}
        </li>
        {sep}
        <li aria-current="page">New project</li>
      </>
    );
  } else {
    trail = <li aria-current="page">Your world</li>;
  }

  return (
    <nav aria-label="Breadcrumb" className="b-scope min-w-0 flex-1">
      <ol className="crumbs">{trail}</ol>
    </nav>
  );
}
