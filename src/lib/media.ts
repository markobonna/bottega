import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/browser";

// Photo plumbing. Browser functions use the browser client; server functions
// take the caller's client first (records.ts convention) and import nothing
// server-only, so this module stays safe to import from client components.

export async function resizeToJpeg(
  file: Blob,
  max = 1600,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("photo resize needs a canvas");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("photo resize failed");
  return blob;
}

export async function uploadPhoto(
  appId: string,
  blob: Blob,
): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("sign in to add a photo");
  const path = `${user.id}/${appId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrls(
  client: SupabaseClient,
  paths: string[],
  seconds = 600,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return {};
  const { data, error } = await client.storage
    .from("media")
    .createSignedUrls(unique, seconds);
  if (error) throw new Error(error.message);
  const urls: Record<string, string> = {};
  for (const [i, path] of unique.entries()) {
    const signed = data[i]?.signedUrl;
    if (signed) urls[path] = signed;
  }
  return urls;
}

export async function downloadAsDataUrl(
  client: SupabaseClient,
  path: string,
): Promise<string> {
  const { data, error } = await client.storage.from("media").download(path);
  if (error || !data) throw new Error(error?.message ?? "download failed");
  const bytes = new Uint8Array(await data.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${data.type || "image/jpeg"};base64,${btoa(binary)}`;
}
