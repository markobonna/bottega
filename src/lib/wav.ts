import { useEffect, useRef, useState } from "react";

export function downmix(channels: Float32Array[]): Float32Array<ArrayBuffer> {
  if (channels.length === 0) return new Float32Array(0);
  const out = new Float32Array(channels[0].length);
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (const ch of channels) sum += ch[i] ?? 0;
    out[i] = sum / channels.length;
  }
  return out;
}

export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
): Uint8Array<ArrayBuffer> {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buf);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, dataLen, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
  }
  return new Uint8Array(buf);
}

export async function recordWav(): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      void (async () => {
        try {
          const ctx = new AudioContext();
          try {
            const decoded = await ctx.decodeAudioData(
              await new Blob(chunks).arrayBuffer(),
            );
            const mono = downmix(
              Array.from({ length: decoded.numberOfChannels }, (_, c) =>
                decoded.getChannelData(c),
              ),
            );
            const off = new OfflineAudioContext(
              1,
              Math.max(1, Math.ceil((mono.length * 16000) / decoded.sampleRate)),
              16000,
            );
            const src = off.createBuffer(1, mono.length, decoded.sampleRate);
            src.copyToChannel(mono, 0);
            const node = off.createBufferSource();
            node.buffer = src;
            node.connect(off.destination);
            node.start();
            const rendered = await off.startRendering();
            resolve(
              new Blob([encodeWav(rendered.getChannelData(0), 16000)], {
                type: "audio/wav",
              }),
            );
          } finally {
            await ctx.close();
          }
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Recording failed."));
        }
      })();
    };
  });
  rec.start();
  const hardStop = setTimeout(() => {
    if (rec.state !== "inactive") rec.stop();
  }, 60000);
  let stopped = false;
  return {
    stop: () => {
      if (!stopped) {
        stopped = true;
        clearTimeout(hardStop);
        if (rec.state !== "inactive") rec.stop();
      }
      return done;
    },
  };
}

// Hold-to-talk (pointer) with click-to-toggle (keyboard/switch). Spread
// `handlers` onto the button and set aria-pressed={recording}.
export function useRecorder(callbacks: {
  onBlob: (blob: Blob) => void;
  onDenied: () => void;
  onFailed: () => void;
}) {
  const recRef = useRef<{ stop: () => Promise<Blob> } | null>(null);
  const startingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const finishedRef = useRef(false);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  async function start() {
    if (recRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      const rec = await recordWav();
      recRef.current = rec;
      setSecs(0);
      setRecording(true);
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        await finish();
      }
    } catch (e) {
      // A failed start can't consume a latched stop; clear it so the
      // next press isn't poisoned.
      stopRequestedRef.current = false;
      if (
        e instanceof Error &&
        (e.name === "NotAllowedError" ||
          e.name === "SecurityError" ||
          e.name === "NotFoundError" ||
          e.name === "NotSupportedError")
      ) {
        // NotSupportedError: no usable mic, or the browser refused capture.
        cbRef.current.onDenied();
      } else {
        cbRef.current.onFailed();
      }
    } finally {
      startingRef.current = false;
    }
  }

  async function finish() {
    const rec = recRef.current;
    if (!rec) {
      // Latch a stop only if a start is still acquiring; otherwise
      // nothing will consume it and the next press would instant-stop.
      if (startingRef.current) stopRequestedRef.current = true;
      return;
    }
    recRef.current = null;
    setRecording(false);
    stopRequestedRef.current = false;
    finishedRef.current = true;
    setTimeout(() => {
      finishedRef.current = false;
    }, 500);
    try {
      cbRef.current.onBlob(await rec.stop());
    } catch {
      cbRef.current.onFailed();
    }
  }

  return {
    recording,
    secs,
    handlers: {
      onPointerDown: () => void start(),
      onPointerUp: () => void finish(),
      onPointerLeave: () => void finish(),
      onPointerCancel: () => void finish(),
      onClick: () => {
        if (finishedRef.current) {
          finishedRef.current = false;
        } else if (recording) {
          void finish();
        } else {
          void start();
        }
      },
    },
  };
}
