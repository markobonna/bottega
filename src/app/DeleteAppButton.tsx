"use client";

import { useRouter } from "next/navigation";
import { Confirm } from "@/components/ui";
import { deleteApp } from "./actions";

export default function DeleteAppButton({ appId }: { appId: string }) {
  const router = useRouter();
  return (
    <Confirm
      label="Delete"
      onConfirm={async () => {
        await deleteApp(appId);
        router.refresh();
      }}
    />
  );
}
