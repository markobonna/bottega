import { card } from "../ui";
import type { BlockProps } from "./registry";

export default function UnknownBlock({ block }: BlockProps) {
  return (
    <div className={`${card} border-dashed p-4`}>
      <p className="text-muted">
        {block.title}: this block isn&apos;t built yet ({block.type})
      </p>
    </div>
  );
}
