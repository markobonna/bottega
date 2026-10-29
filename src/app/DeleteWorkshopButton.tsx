"use client";

import { useRouter } from "next/navigation";
import { Confirm } from "@/components/ui";
import { deleteWorkshop } from "./actions";

export default function DeleteWorkshopButton({
  workshopId,
}: {
  workshopId: string;
}) {
  const router = useRouter();
  return (
    <Confirm
      label="Delete"
      onConfirm={async () => {
        await deleteWorkshop(workshopId);
        router.push("/");
        router.refresh();
      }}
    />
  );
}
