"use client";

import { downloadPackFile, type PackFile } from "@/lib/design/pack-files";
import { BIcon } from "./Dialog";

export default function PackFileList({ files }: { files: PackFile[] }) {
  const B = window.B;
  return (
    <ul className="filelist">
      {files.map((f) => (
        <li key={f.name}>
          <BIcon svg={B.icon("download", 20)} />
          <div className="grow">
            <strong>{f.name}</strong>
            <div className="small">{f.what}</div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => downloadPackFile(f)}
          >
            Download
          </button>
        </li>
      ))}
    </ul>
  );
}
