"use client";

import { useRouter } from "next/navigation";
import { Confirm } from "@/components/ui";
import { deleteApp } from "./actions";

export default function DeleteAppButton({
  appId,
  redirectTo,
}: {
  appId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  return (
    <Confirm
      label="Delete"
      onConfirm={async () => {
        await deleteApp(appId);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }}
    />
  );
}
