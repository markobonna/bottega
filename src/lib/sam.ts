import "server-only";

import {
  decodeMaskToSVGPath,
  parseImageStream,
  recordsOfKind,
} from "@meta-sam/parser";
import OpenAI from "openai";

import { config, MissingKeyError, ModelError } from "./meta";

export interface SamObject {
  box: [number, number, number, number];
  path: string;
  c: number;
}

export interface SamResult {
  w: number;
  h: number;
  objects: SamObject[];
}

function imageDims(dataUrl: string): { w: number; h: number } {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
        return { w: bytes.readUInt16BE(i + 7), h: bytes.readUInt16BE(i + 5) };
      }
      if (marker === 0xda) break;
      i += 2 + bytes.readUInt16BE(i + 2);
    }
  }
  throw new ModelError(502, "unreadable image");
}

export async function segment(dataUrl: string, noun: string): Promise<SamResult> {
  const cfg = config();
  if (!cfg.sam) throw new MissingKeyError();
  const { w, h } = imageDims(dataUrl);
  const client = new OpenAI({
    baseURL: cfg.base,
    apiKey: cfg.key,
    timeout: 45000,
    maxRetries: 0,
  });
  try {
    const events = await client.responses.create({
      model: cfg.sam,
      input: [
        {
          type: "message",
          role: "user",
          content: [
            { type: "input_text", text: noun },
            { type: "input_image", image_url: dataUrl, detail: "auto" },
          ],
        },
      ],
      metadata: { include_confidence: "true" },
      stream: true,
    });
    const result = await parseImageStream(events).finalResult;
    const masks = new Map(
      recordsOfKind(result.records, "mask").map((m) => [m.objectId, m]),
    );
    const objects: SamObject[] = recordsOfKind(result.records, "box").map(
      (box) => {
        const mask = masks.get(box.objectId);
        return {
          box: [box.left, box.top, box.right, box.bottom],
          path: mask ? decodeMaskToSVGPath(mask.mask) : "",
          c: box.confidence ?? mask?.confidence ?? 0,
        };
      },
    );
    return { w, h, objects };
  } catch (e) {
    if (e instanceof MissingKeyError || e instanceof ModelError) throw e;
    const status =
      typeof e === "object" && e !== null && "status" in e
        ? (e.status as number)
        : 502;
    throw new ModelError(
      status,
      e instanceof Error ? e.message : "segmentation failed",
    );
  }
}
